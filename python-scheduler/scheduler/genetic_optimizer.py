"""
=============================================================================
ALGORYTM GENETYCZNY - OPTYMALIZACJA GRAFIKU
=============================================================================

Optymalizuje grafik metodą ewolucyjną.
Operatory genetyczne:
- Selekcja turniejowa
- Krzyżowanie jednopunktowe
- Mutacje: swap, move, change template
"""

import random
import logging
from typing import List, Tuple, Set
from datetime import datetime, timedelta
from copy import deepcopy

from .types import (
    SchedulerInput, 
    GeneratedShift, 
    Employee,
    ShiftTemplate,
    POLISH_LABOR_CODE
)
from .evaluator import evaluate_schedule, quick_fitness
from .validator import ScheduleValidator
from .utils import get_shift_time_type, get_day_of_week

logger = logging.getLogger(__name__)

# =============================================================================
# KONFIGURACJA
# =============================================================================

class GeneticConfig:
    """Konfiguracja algorytmu genetycznego"""
    def __init__(
        self,
        population_size: int = 30,
        generations: int = 100,
        mutation_rate: float = 0.2,
        crossover_rate: float = 0.7,
        elite_count: int = 2,
        tournament_size: int = 3,
        timeout_ms: int = 5000
    ):
        self.population_size = population_size
        self.generations = generations
        self.mutation_rate = mutation_rate
        self.crossover_rate = crossover_rate
        self.elite_count = elite_count
        self.tournament_size = tournament_size
        self.timeout_ms = timeout_ms

DEFAULT_CONFIG = GeneticConfig()

FAST_CONFIG = GeneticConfig(
    population_size=15,
    generations=30,
    mutation_rate=0.25,
    crossover_rate=0.6,
    elite_count=1,
    tournament_size=2,
    timeout_ms=2000
)

# =============================================================================
# OSOBNIK (ROZWIĄZANIE)
# =============================================================================

class Individual:
    """Osobnik w populacji - kompletny grafik"""
    
    def __init__(self, shifts: List[GeneratedShift]):
        self.shifts = shifts
        self.fitness = 0.0
    
    def clone(self) -> 'Individual':
        """Klonuje osobnika"""
        return Individual([
            GeneratedShift(
                employee_id=s.employee_id,
                date=s.date,
                start_time=s.start_time,
                end_time=s.end_time,
                break_minutes=s.break_minutes,
                template_id=s.template_id
            )
            for s in self.shifts
        ])

# =============================================================================
# GŁÓWNA KLASA OPTYMALIZERA
# =============================================================================

class GeneticOptimizer:
    """Optymalizator genetyczny dla grafików"""
    
    def __init__(
        self, 
        scheduler_input: SchedulerInput,
        config: dict = None
    ):
        self.input = scheduler_input
        
        # Konfiguracja
        if config:
            self.config = GeneticConfig(**config)
        else:
            self.config = DEFAULT_CONFIG
        
        # Dane pomocnicze
        self.all_working_days = sorted(
            scheduler_input.work_days + 
            scheduler_input.saturday_days + 
            scheduler_input.trading_sundays
        )
        
        self.weekend_days = set(
            scheduler_input.saturday_days + 
            scheduler_input.trading_sundays
        )
        
        self.validator = ScheduleValidator(scheduler_input)
        
        # Indeksy dla szybkiego dostępu
        self.employees_map = {emp.id: emp for emp in scheduler_input.employees}
        self.templates_map = {tmpl.id: tmpl for tmpl in scheduler_input.templates}
    
    # =========================================================================
    # GŁÓWNA METODA OPTYMALIZACJI
    # =========================================================================
    
    def optimize(self, initial_shifts: List[GeneratedShift]) -> List[GeneratedShift]:
        """
        Optymalizuje grafik algorytmem genetycznym
        
        Args:
            initial_shifts: Początkowy grafik do optymalizacji
            
        Returns:
            Zoptymalizowany grafik
        """
        start_time = datetime.now()
        
        logger.info("🧬 === GENETIC OPTIMIZER - START ===")
        logger.info(f"Populacja: {self.config.population_size}, "
                   f"Generacje: {self.config.generations}")
        
        # Fitness początkowy
        initial_fitness = quick_fitness(initial_shifts, self.input)
        logger.info(f"Fitness początkowy: {initial_fitness:.2f}")
        
        # Inicjalizacja populacji
        population = self._initialize_population(initial_shifts)
        
        best_individual = population[0]
        generations_without_improvement = 0
        
        # Główna pętla ewolucji
        for generation in range(self.config.generations):
            # Timeout
            elapsed_ms = (datetime.now() - start_time).total_seconds() * 1000
            if elapsed_ms > self.config.timeout_ms:
                logger.info(f"⏱️ Timeout po {generation} generacjach")
                break
            
            # Sortuj po fitness
            population.sort(key=lambda ind: ind.fitness, reverse=True)
            
            # Sprawdź postęp
            if population[0].fitness > best_individual.fitness:
                best_individual = population[0]
                generations_without_improvement = 0
                logger.info(f"Gen {generation}: Nowy najlepszy fitness = {best_individual.fitness:.2f}")
            else:
                generations_without_improvement += 1
            
            # Early stopping
            if generations_without_improvement > 20:
                logger.info(f"Brak poprawy przez 20 generacji, zatrzymuję")
                break
            
            # Nowa generacja
            new_population: List[Individual] = []
            
            # Elitaryzm - zachowaj najlepszych
            for i in range(self.config.elite_count):
                new_population.append(population[i].clone())
            
            # Generuj potomków
            while len(new_population) < self.config.population_size:
                parent1 = self._tournament_select(population)
                parent2 = self._tournament_select(population)
                
                # Krzyżowanie
                if random.random() < self.config.crossover_rate:
                    child = self._crossover(parent1, parent2)
                else:
                    child = parent1.clone()
                
                # Mutacja
                if random.random() < self.config.mutation_rate:
                    self._mutate(child)
                
                # Przelicz fitness
                child.fitness = quick_fitness(child.shifts, self.input)
                new_population.append(child)
            
            population = new_population
        
        # Najlepsze rozwiązanie
        population.sort(key=lambda ind: ind.fitness, reverse=True)
        best = population[0]
        
        improvement = ((best.fitness - initial_fitness) / initial_fitness * 100)
        
        logger.info(f"✅ Fitness końcowy: {best.fitness:.2f}")
        logger.info(f"📈 Poprawa: {improvement:.2f}%")
        logger.info("🧬 === GENETIC OPTIMIZER - END ===\n")
        
        return best.shifts
    
    # =========================================================================
    # INICJALIZACJA POPULACJI
    # =========================================================================
    
    def _initialize_population(self, base_shifts: List[GeneratedShift]) -> List[Individual]:
        """Inicjalizuje populację początkową"""
        population = []
        
        # Pierwszy osobnik - oryginalne rozwiązanie
        base_individual = Individual(base_shifts)
        base_individual.fitness = quick_fitness(base_shifts, self.input)
        population.append(base_individual)
        
        # Reszta populacji - wariacje
        for _ in range(self.config.population_size - 1):
            variant = base_individual.clone()
            
            # Losowe mutacje dla różnorodności
            num_mutations = random.randint(1, 5)
            for _ in range(num_mutations):
                self._mutate(variant)
            
            variant.fitness = quick_fitness(variant.shifts, self.input)
            population.append(variant)
        
        return population
    
    # =========================================================================
    # SELEKCJA
    # =========================================================================
    
    def _tournament_select(self, population: List[Individual]) -> Individual:
        """Selekcja turniejowa"""
        tournament = random.sample(population, self.config.tournament_size)
        return max(tournament, key=lambda ind: ind.fitness)
    
    # =========================================================================
    # KRZYŻOWANIE
    # =========================================================================
    
    def _crossover(self, parent1: Individual, parent2: Individual) -> Individual:
        """
        Krzyżowanie jednopunktowe
        Łączy zmiany z dwóch rodziców
        """
        # Grupuj zmiany po pracownikach
        p1_by_emp = {}
        p2_by_emp = {}
        
        for shift in parent1.shifts:
            if shift.employee_id not in p1_by_emp:
                p1_by_emp[shift.employee_id] = []
            p1_by_emp[shift.employee_id].append(shift)
        
        for shift in parent2.shifts:
            if shift.employee_id not in p2_by_emp:
                p2_by_emp[shift.employee_id] = []
            p2_by_emp[shift.employee_id].append(shift)
        
        # Losowy punkt cięcia
        all_employees = list(self.employees_map.keys())
        cutpoint = random.randint(1, len(all_employees) - 1)
        
        # Połącz
        child_shifts = []
        for i, emp_id in enumerate(all_employees):
            if i < cutpoint:
                child_shifts.extend(p1_by_emp.get(emp_id, []))
            else:
                child_shifts.extend(p2_by_emp.get(emp_id, []))
        
        return Individual(child_shifts)
    
    # =========================================================================
    # MUTACJE
    # =========================================================================
    
    def _mutate(self, individual: Individual):
        """
        Losowa mutacja osobnika
        Wybiera jeden z 3 typów mutacji
        """
        mutation_type = random.choice(['swap', 'move', 'change_template'])
        
        if mutation_type == 'swap':
            self._mutate_swap(individual)
        elif mutation_type == 'move':
            self._mutate_move(individual)
        else:
            self._mutate_change_template(individual)
    
    def _mutate_swap(self, individual: Individual):
        """Zamienia zmiany między dwoma pracownikami"""
        if len(individual.shifts) < 2:
            return
        
        # Wybierz dwie losowe zmiany
        shift1, shift2 = random.sample(individual.shifts, 2)
        
        # Zamień pracowników
        shift1.employee_id, shift2.employee_id = shift2.employee_id, shift1.employee_id
    
    def _mutate_move(self, individual: Individual):
        """Przenosi zmianę na inny dzień"""
        if not individual.shifts:
            return
        
        shift = random.choice(individual.shifts)
        
        # Wybierz inny dzień
        available_days = [d for d in self.all_working_days if d != shift.date]
        if not available_days:
            return
        
        new_date = random.choice(available_days)
        shift.date = new_date
    
    def _mutate_change_template(self, individual: Individual):
        """Zmienia szablon zmiany"""
        if not individual.shifts:
            return
        
        shift = random.choice(individual.shifts)
        employee = self.employees_map.get(shift.employee_id)
        
        if not employee or not employee.template_assignments:
            return
        
        # Wybierz inny szablon
        available_templates = [
            tmpl for tmpl in self.input.templates
            if tmpl.id in employee.template_assignments
        ]
        
        if not available_templates:
            return
        
        new_template = random.choice(available_templates)
        
        # Zaktualizuj zmianę
        shift.start_time = new_template.start_time
        shift.end_time = new_template.end_time
        shift.break_minutes = new_template.break_minutes
        shift.template_id = new_template.id
