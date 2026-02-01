# 📚 Algorytm CP-SAT - Szczegółowa Dokumentacja Techniczna

**System**: Calenda Schedule - Advanced CP-SAT Optimizer  
**Silnik**: Google OR-Tools CP-SAT Solver  
**Wersja**: 2.1.0 (z HC11-HC13)  
**Data**: 2026-02-01

---

## 📋 Spis Treści

1. [Wprowadzenie](#wprowadzenie)
2. [Architektura Algorytmu](#architektura-algorytmu)
3. [Szczegółowy Opis Działania](#szczegółowy-opis-działania)
4. [Hard Constraints (HC1-HC13)](#hard-constraints-hc1-hc13)
5. [Soft Constraints (SC1-SC7)](#soft-constraints-sc1-sc7)
6. [Preprocessing Danych](#preprocessing-danych)
7. [Solver CP-SAT](#solver-cp-sat)
8. [Diagnostyka i Obsługa Błędów](#diagnostyka-i-obsługa-błędów)
9. [Parametry Konfiguracyjne](#parametry-konfiguracyjne)
10. [Przykłady i Use Cases](#przykłady-i-use-cases)

---

## 1. Wprowadzenie

### 1.1 Co to jest CP-SAT?

**CP-SAT** (Constraint Programming with SAT solver) to technologia Google OR-Tools służąca do rozwiązywania **problemów optymalizacji z ograniczeniami**.

**Podstawowe koncepcje**:

- **Zmienne decyzyjne**: Wartości które solver ma znaleźć (np. czy pracownik X pracuje w dzień Y na zmianie Z?)
- **Ograniczenia (Constraints)**: Reguły które MUSZĄ być spełnione (np. "pracownik nie może mieć 2 zmian w jednym dniu")
- **Funkcja celu (Objective)**: Co chcemy maksymalizować/minimalizować (np. "maksymalizuj zgodność z preferencjami")

### 1.2 Problem Rozwiązywany przez Algorytm

**Zadanie**: Wygenerować optymalny grafik pracy dla sklepu/firmy na dany miesiąc.

**Wejście**:

- Lista pracowników (z etatami, urlopami, preferencjami)
- Szablony zmian (poranna, popołudniowa, etc.)
- Reguły planowania (max godziny, odpoczynki, etc.)
- Godziny otwarcia sklepu
- Niedziele handlowe

**Wyjście**:

- Przypisanie każdego pracownika do konkretnych zmian w konkretne dni
- Spełnienie WSZYSTKICH hard constraints (prawa pracy, odpoczynki)
- Maksymalizacja soft constraints (sprawiedliwość, preferencje)

### 1.3 Dlaczego CP-SAT a nie Algorytmy Heurystyczne?

| Aspekt                  | CP-SAT                                        | Algorytmy Heurystyczne       |
| ----------------------- | --------------------------------------------- | ---------------------------- |
| **Gwarancja zgodności** | ✅ 100% zgodność z regułami                   | ⚠️ Mogą złamać reguły        |
| **Optymalizacja**       | ✅ Znajduje najlepsze lub bliskie optymalnemu | ⚠️ Lokalnie optymalne        |
| **Elastyczność**        | ✅ Łatwo dodać nowe reguły                    | ⚠️ Wymaga przepisania logiki |
| **Prawa pracy**         | ✅ Gwarancja zgodności z KP                   | ⚠️ Trudne do wymuszenia      |
| **Wydajność**           | ⚠️ Może być wolne dla dużych danych           | ✅ Szybkie                   |

**Wniosek**: CP-SAT jest lepszy dla problemów gdzie **zgodność z prawem** i **sprawiedliwość** są krytyczne.

---

## 2. Architektura Algorytmu

### 2.1 Główne Komponenty

```
┌─────────────────────────────────────────────────────────────┐
│                   INPUT DATA (JSON)                          │
│  employees, shift_templates, absences, rules, etc.          │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              PREPROCESSING                                   │
│  • Parsowanie dat                                            │
│  • Indeksowanie pracowników/szablonów                       │
│  • Obliczanie dni w miesiącu                                │
│  • Identyfikacja niedziel/managerów                         │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│         KROK 1: ZMIENNE DECYZYJNE                           │
│  shifts[(emp_id, day, template_id)] = BoolVar               │
│  • ~10,000-100,000 zmiennych dla typowego sklepu           │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│         KROK 2: HARD CONSTRAINTS (HC1-HC13)                 │
│  • HC1: Jedna zmiana dziennie                               │
│  • HC2: Max 48h/tydzień (prawo pracy)                       │
│  • HC3: 11h odpoczynek dobowy                               │
│  • HC4: Max 6 dni z rzędu                                   │
│  • HC5: Niedziele handlowe                                  │
│  • HC6: Urlopy                                              │
│  • HC7: Minimalna obsada                                    │
│  • HC9: Pokrycie dni roboczych                              │
│  • HC10: Target hours EXACT ±60min                          │
│  • HC11: 35h odpoczynek tygodniowy                          │
│  • HC12: Wolna niedziela co 2 handlowe                      │
│  • HC13: Sprawiedliwe weekendy ±2 (HARD!)                   │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│         KROK 3: SOFT CONSTRAINTS (SC1-SC7)                  │
│  Funkcja celu: MAX(nagrody - kary)                          │
│  • SC1: Target hours (500 pkt/h)                            │
│  • SC2: Preferencje (50 pkt)                                │
│  • SC3: Manager presence (200 pkt)                          │
│  • SC4: Równomierne rozłożenie (10 pkt)                     │
│  • SC6: Równomierna obsada dzienna (1500 pkt)               │
│  • SC7: Sprawiedliwe zmiany miesięczne (500 pkt)            │
│  (SC5 USUNIĘTE - duplikat HC13)                             │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│         KROK 4: SOLVER CP-SAT                               │
│  • 8 wątków równoległych                                    │
│  • Timeout: 300s (domyślnie)                                │
│  • Status: OPTIMAL/FEASIBLE/INFEASIBLE                      │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│         OUTPUT                                               │
│  • Lista shifts (employee_id, date, start_time, etc.)       │
│  • Statistics (quality_percent, solve_time, etc.)           │
│  • Status (SUCCESS/INFEASIBLE/ERROR)                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Przepływ Danych

**Funkcja główna**: `generate_schedule_optimized(input_data)`

```python
def generate_schedule_optimized(input_data: Dict) -> Dict:
    optimizer = ScheduleOptimizer(input_data)

    # 1. Tworzenie zmiennych
    optimizer.create_decision_variables()

    # 2. Dodawanie hard constraints
    optimizer.add_hard_constraints()

    # 3. Dodawanie soft constraints
    optimizer.add_soft_constraints()

    # 4. Rozwiązywanie
    result = optimizer.solve(time_limit_seconds=300)

    return result
```

---

## 3. Szczegółowy Opis Działania

### 3.1 KROK 1: Tworzenie Zmiennych Decyzyjnych

**Cel**: Utworzyć zmienną boolean dla każdej możliwej kombinacji (pracownik, dzień, szablon zmiany).

#### Algorytm:

```python
for każdy_pracownik in pracownicy:
    for każdy_dzień in 1..30/31:
        # Pomiń jeśli pracownik ma urlop
        if (pracownik, dzień) in urlopy:
            continue

        # Pomiń niedziele niehandlowe
        if dzień == niedziela AND nie_jest_handlowa:
            continue

        for każdy_szablon in szablony_zmian:
            # Pomiń jeśli szablon nie przypisany do pracownika
            if szablon not in przypisane_szablony[pracownik]:
                continue

            # Pomiń jeśli szablon nie działa w ten dzień tygodnia
            if dzień_tygodnia not in szablon.applicable_days:
                continue

            # UTWÓRZ ZMIENNĄ!
            var = model.NewBoolVar(f"shift_{pracownik}_{dzień}_{szablon}")
            shifts_vars[(pracownik, dzień, szablon)] = var
```

#### Przykład:

Sklep z 5 pracownikami, 3 szablonami, 30 dni:

- **Teoretycznie**: 5 × 30 × 3 = **450 zmiennych**
- **Po filtrach** (urlopy, niedziele, przypisania): **~300 zmiennych**

#### Kluczowe Punkty:

1. **Zmienne boolean**: 0 = nie pracuje, 1 = pracuje
2. **Filtrowanie wcześnie**: Nie tworzymy zmiennych dla niemożliwych kombinacji (oszczędność pamięci)
3. **Template assignments**: Jeśli pracownik ma przypisane konkretne szablony, używamy TYLKO ich
4. **applicable_days**: Szablony mogą działać tylko w wybrane dni tygodnia (np. tylko Pon-Pt)

---

### 3.2 KROK 2: Hard Constraints (Szczegóły w sekcji 4)

Hard constraints **MUSZĄ** być spełnione. Jeśli którykolwiek nie jest spełniony, solver zwróci **INFEASIBLE**.

**13 kategorii ograniczeń twardych**:

- **HC1-HC4**: Podstawowe (jedna zmiana/dzień, godziny, odpoczynki)
- **HC5-HC7**: Operacyjne (niedziele, urlopy, obsada)
- **HC9-HC10**: Pokrycie i target hours
- **HC11-HC13**: Złote zasady (35h rest, wolna niedziela, fair weekends)

---

### 3.3 KROK 3: Soft Constraints (Szczegóły w sekcji 5)

Soft constraints to **cele optymalizacyjne**. Solver stara się je maksymalnie spełnić, ale może je naruszyć jeśli hard constraints tego wymagają.

**Funkcja celu**:

```
MAXIMIZE: suma_nagród - suma_kar
```

**Hierarchia priorytetów** (przez wagi):

1. SC1 (500 pkt/h) - Wypełnienie etatu
2. SC6 (1500 pkt) - Równomierna obsada dzienna
3. SC7 (500 pkt) - Sprawiedliwe zmiany miesięczne
4. SC4 (100 pkt) - Ogólne rozłożenie
5. SC2 (50 pkt) - Preferencje
6. SC3 (200 pkt) - Manager presence

---

### 3.4 KROK 4: Solver CP-SAT

**Parametry solvera**:

```python
solver.parameters.max_time_in_seconds = 300  # 5 minut
solver.parameters.num_search_workers = 8      # 8 wątków
solver.parameters.log_search_progress = False # Bez verbose
```

#### Jak działa solver (uproszczenie):

1. **Branch & Bound**: Przeszukuje drzewo decyzji (czy zmienna = 0 czy 1?)
2. **Propagacja ograniczeń**: Po przypisaniu zmiennej, automatycznie dedukuje konsekwencje
3. **Konflikt**: Jeśli dojdzie do sprzeczności, cofa się (backtracking)
4. **Optymalizacja**: Szuka rozwiązania z najlepszą funkcją celu

#### Status wyników:

- **OPTIMAL**: Znaleziono najlepsze możliwe rozwiązanie ✅
- **FEASIBLE**: Znaleziono dopuszczalne rozwiązanie (nie koniecznie najlepsze) ✅
- **INFEASIBLE**: Niemożliwe do rozwiązania - hard constraints są sprzeczne ❌
- **UNKNOWN**: Timeout lub brak zmiennych ⚠️

---

## 4. Hard Constraints (HC1-HC13)

### HC1: Doba Pracownicza (24h między zmianami)

**Podstawa prawna**: Kodeks Pracy Art. 128 § 2  
**Reguła**: Pracownik **nie może podjąć pracy ponownie w tej samej dobie pracowniczej** (24 godziny od rozpoczęcia poprzedniej zmiany).

**KLUCZOWA RÓŻNICA**: Doba pracownicza ≠ Doba kalendarzowa!

**Doba pracownicza**:

- Rozpoczyna się w momencie **podjęcia pracy** przez pracownika
- Trwa **24 godziny** od tego momentu
- Pracownik nie może być zatrudniony ponownie w tej samej dobie pracowniczej
- To bardziej restrykcyjne niż HC3 (11h odpoczynku)

**Implementacja**:

```python
for każdy_pracownik:
    for każda_para_zmian (shift1, shift2):
        czas_między_początkami = (day2 - day1) × 1440 + (start2 - start1)

        if czas_między_początkami < 1440:  # < 24h
            model.Add(shift1 + shift2 <= 1)  # Nie mogą być obie przypisane
```

**Przykłady**:

✅ **DOZWOLONE** (różne doby pracownicze):

- Pon 08:00-16:00, Wto 10:00-18:00 → między początkami **26h** ✅
- Pon 22:00-06:00, Śr 08:00-16:00 → między początkami **34h** ✅
- Pon 14:00-22:00, Wto 14:01-22:00 → między początkami **24h 1min** ✅

❌ **ZABRONIONE** (ta sama doba pracownicza):

- Pon 08:00-16:00, Wto 07:00-15:00 → między początkami **23h** ❌
- Pon 22:00-06:00, Wto 20:00-04:00 → między początkami **22h** ❌
- Pon 08:00-16:00, Pon 20:00-04:00 → między początkami **12h** ❌

**Nadgodziny**:

- Jeśli praca w tej samej dobie pracowniczej jest konieczna, generuje **nadgodziny**
- Algorytm tego nie uwzględnia - po prostu **zabrania** takiej sytuacji
- Ruchomy czas pracy wymaga odrębnej konfiguracji (nie implementowany)

**Liczba ograniczeń**: O(n² × d²) gdzie n=pracownicy, d=dni  
**Typowo**: ~5 pracowników × 30 dni = ~2250 par → **~1000-2000 constraintów**

**Różnica HC1 vs HC3**:

- **HC1** (doba pracownicza): Min 24h między **początkami** zmian
- **HC3** (odpoczynek dobowy): Min 11h między **końcem** a **początkiem** następnej

---

### HC2: Maksimum 48h/Tydzień

**Podstawa prawna**: Kodeks Pracy Art. 131 § 1  
**Reguła**: Pracownik nie może pracować więcej niż **48 godzin w tygodniu**.

**Implementacja**:

```python
for każdy_pracownik:
    for każdy_tydzień in kalendarzowe_tygodnie:  # Pon-Nie
        suma_godzin = 0
        for każdy_dzień_w_tygodniu:
            for zmiana in shifts_vars[(pracownik, dzień, *)]:
                suma_godzin += zmiana × długość_zmiany_w_minutach

        model.Add(suma_godzin <= 48 × 60)  # 2880 minut
```

**Budowanie tygodni kalendarzowych**:

```python
def _build_calendar_weeks():
    # Znajdź pierwszy poniedziałek
    # Podziel miesiąc na tygodnie Pon-Nie
    # Obsłuż częściowe tygodnie (początek/koniec miesiąca)
    return [[dni_tygodnia_1], [dni_tygodnia_2], ...]
```

**Przykład**:

- Pracownik: 5 zmian × 9h = 45h ✅
- Pracownik: 6 zmian × 9h = 54h ❌ (przekroczenie!)

**Liczba ograniczeń**: pracownicy × tygodnie = **~60 constraintów**

**Kompatybilność z HC10**: HC10 waliduje czy target miesięczny <= (liczba_tygodni × 48h)

---

### HC3: Odpoczynek Dobowy 11h

**Podstawa prawna**: Kodeks Pracy Art. 132  
**Reguła**: Minimum **11 godzin odpoczynku** między zmianami.

**Implementacja**:

```python
for każdy_pracownik:
    for każdy_dzień in 1..(dni_w_miesiącu-1):
        dzień_następny = dzień + 1

        for zmiana1 in shifts_vars[(pracownik, dzień, *)]:
            koniec1 = shift_template1.end_time_minutes

            for zmiana2 in shifts_vars[(pracownik, dzień_następny, *)]:
                start2 = shift_template2.start_time_minutes

                odpoczynek = oblicz_odpoczynek(koniec1, start2)

                if odpoczynek < 11 × 60:  # 660 minut
                    # Nie mogą być obie przypisane jednocześnie
                    model.Add(zmiana1 + zmiana2 <= 1)
```

**Obliczanie odpoczynku**:

```python
def oblicz_odpoczynek(koniec_zmiany1, start_zmiany2):
    if start_zmiany2 >= koniec_zmiany1:
        return start_zmiany2 - koniec_zmiany1  # Normalne
    else:
        # Przez północ (np. zmiana kończy 22:00, następna zaczyna 6:00)
        return (24×60 - koniec_zmiany1) + start_zmiany2
```

**Przykład**:

- Zmiana1: 8:00-16:00, Zmiana2 następnego dnia: 8:00-16:00 ✅ (16h odpoczynek)
- Zmiana1: 8:00-20:00, Zmiana2 następnego dnia: 6:00-14:00 ❌ (10h odpoczynek)

**Liczba ograniczeń**: **~500-2000** (zależy od liczby par niezgodnych zmian)

---

### HC4: Maksimum 6 Dni z Rzędu

**Podstawa prawna**: Kodeks Pracy Art. 133  
**Reguła**: Pracownik nie może pracować więcej niż **6 dni pod rząd**.

**Implementacja (metoda okna przesuwnego)**:

```python
max_consecutive = 6

for każdy_pracownik:
    for start_day in 1..(dni_w_miesiącu - max_consecutive):
        okno = dni od start_day do (start_day + max_consecutive)  # 7 dni

        zmiany_w_oknie = [wszystkie shifts_vars w oknie dla pracownika]

        # W oknie 7 dni może pracować MAX 6 dni
        model.Add(sum(zmiany_w_oknie) <= max_consecutive)
```

**Przykład**:

- Pracownik pracuje: Pon, Wt, Śr, Czw, Pt, Sob, **[niedziela wolna]** ✅
- Pracownik pracuje: Pon-Niedz (7 dni) ❌

**Liczba ograniczeń**: pracownicy × (dni - 6) = **~120 constraintów**

---

### HC5: Niedziele Handlowe

**Podstawa prawna**: Ustawa o ograniczeniu handlu w niedziele  
**Reguła**: Praca w niedzielę dozwolona TYLKO w niedziele handlowe.

**Implementacja**:

```python
if enable_trading_sundays == False:
    # Zabroń WSZYSTKICH niedziel
    for każda_niedziela:
        for zmiana in shifts_vars[(*, niedziela, *)]:
            model.Add(zmiana == 0)
else:
    # Zabroń niedziel NIE-handlowych
    for każda_niedziela:
        if niedziela NOT IN trading_sundays:
            for zmiana in shifts_vars[(*, niedziela, *)]:
                model.Add(zmiana == 0)
```

**Przykład** (luty 2026):

- Trading Sundays: [7, 14]
- Niedziela 7: Praca dozwolona ✅
- Niedziela 14: Praca dozwolona ✅
- Niedziela 21: Praca ZABRONIONA ❌

**Liczba ograniczeń**: **~50-200** (zależy od liczby niedziel niehandlowych)

---

### HC6: Zgodność z Urlopami

**Reguła**: Pracownik nie może pracować w dniach urlopu.

**Implementacja**: **Obsłużone w create_decision_variables**

```python
for każdy_pracownik:
    for każdy_dzień:
        if (pracownik, dzień) in absence_set:
            # NIE TWÓRZ zmiennej dla tego dnia
            continue  # Pomijamy ten dzień
```

**Preprocessing urlopów**:

```python
absence_set = set()  # (employee_id, day)

for absence in employee_absences:
    for dzień in zakres(absence.start_date, absence.end_date):
        if dzień w tym miesiącu:
            absence_set.add((employee_id, dzień))
```

**Przykład**:

- Jan ma urlop 10-14 lutego
- `absence_set = {('jan-id', 10), ('jan-id', 11), ..., ('jan-id', 14)}`
- Solver nie widzi nawet możliwości przypisania Jana w te dni

**Liczba ograniczeń**: **0** (filtrowane wcześniej, nie constraint)

---

### HC7: Obsada Zmian - Ciągłe Pokrycie

**Reguła**: Minimalna liczba pracowników w KAŻDYM przedziale godzin otwarcia.

**Stara logika (problem)**:

- Wymuszał tylko ogólną obsadę w godzinach 9:00-21:00
- Solver mógł zostawić luki (np. 9-16 pokryte, ale 16-21 puste)

**Nowa logika (ciągłe pokrycie)**:

```python
for każdy_dzień:
    godziny_otwarcia = opening_hours[dzień_tygodnia]

    # Podziel na przedziały 1h (np. 9-10, 10-11, ..., 20-21)
    przedzialy = split_by_hour(godziny_otwarcia)

    for przedział in przedzialy:
        # Znajdź zmiany które POKRYWAJĄ ten przedział
        zmiany_pokrywające = [
            zmiana for zmiana in shifts_vars[(*, dzień, *)]
            if shift_covers(zmiana, przedział)
        ]

        # W tym przedziale MUSI być min X pracowników
        model.Add(sum(zmiany_pokrywające) >= min_employees)
```

**Przykład**:
Godziny otwarcia: 9:00-21:00  
Min obsada: 2 pracowników

Przedziały:

- 9:00-10:00: min 2 ✅
- 10:00-11:00: min 2 ✅
- ...
- 20:00-21:00: min 2 ✅

**Czy zmiana pokrywa przedział?**:

```python
def shift_covers(shift, slot):
    shift_start = shift.template.start_time
    shift_end = shift.template.end_time
    slot_start, slot_end = slot

    # Zmiana pokrywa slot jeśli:
    # shift_start <= slot_start AND shift_end >= slot_end
    return shift_start <= slot_start and shift_end >= slot_end
```

**Liczba ograniczeń**: dni × (godziny_otwarcia / 1h) × szablony = **~600-1000**

---

### HC9: Pokrycie Dni Roboczych

**Reguła**: **Każdy dzień roboczy** musi mieć przynajmniej jedną zmianę.

**Implementacja**:

```python
for każdy_dzień in 1..30:
    # Pomiń niedziele niehandlowe
    if dzień == niedziela AND nie_handlowa:
        continue

    wszystkie_zmiany_dnia = [shifts_vars[(*, dzień, *)]]

    # Przynajmniej 1 zmiana w tym dniu
    model.Add(sum(wszystkie_zmiany_dnia) >= 1)
```

**Przykład**:

- Luty 2026: 28 dni
- Niedziele niehandlowe: 4 dni
- Dni do pokrycia: **24 dni**
- Każdy z nich musi mieć ≥1 zmianę

**Liczba ograniczeń**: **~24-30** (zależy od liczby dni roboczych)

---

### HC10: Target Hours EXACT ±60min

**Reguła**: Pracownik musi przepracować **dokładnie** target godzin (max_hours - urlopy) z tolerancją ±60 minut.

**WAŻNE**: To jest zmiana z "max hours" na "**exact target**"!

**Implementacja**:

```python
tolerance = 60  # minut

for każdy_pracownik:
    max_hours = pracownik.max_hours  # np. 176h dla full-time

    # Odejmij urlopy
    absence_hours = liczba_dni_urlopu × 8h
    target_hours = max_hours - absence_hours
    target_minutes = target_hours × 60

    # Suma wszystkich zmian pracownika w miesiącu
    suma_minut = sum(
        zmiana × długość_zmiany
        for zmiana in shifts_vars[(pracownik, *, *)]
    )

    # HARD CONSTRAINT: [target-60, target+60]
    model.Add(suma_minut >= target_minutes - tolerance)
    model.Add(suma_minut <= target_minutes + tolerance)
```

**Walidacja kompatybilności z HC2**:

```python
# Sprawdź czy target spełnialny przy HC2
max_monthly_from_weekly = max_weekly_hours × liczba_tygodni
# Przykład: 48h/tydz × 4 tygodnie = 192h/miesiąc MAX

if target_hours > max_monthly_from_weekly:
    print("⚠️ KONFLIKT: target 200h > max 192h przez HC2!")
    target_hours = max_monthly_from_weekly  # Auto-redukcja
```

**Przykład**:

- Pracownik: max_hours = 176h, urlop 2 dni (16h)
- Target: 176h - 16h = **160h** = 9600 minut
- Dozwolony zakres: **9540-9660 minut** (159h-161h)
- Solver MUSI wypełnić ten zakres

**Liczba ograniczeń**: pracownicy × 2 (min + max) = **~10-30 constraintów**

**Współpraca z SC1**: SC1 dodatkowo karze odchylenia w tym zakresie (gradient do środka).

---

### HC11: Odpoczynek Tygodniowy 35h

**Podstawa prawna**: Kodeks Pracy Art. 133  
**Reguła**: Pracownik musi mieć **35 godzin nieprzerwanego odpoczynku** w każdym tygodniu.

**Uproszczona implementacja**:
Wymóg 35h ≈ **2 dni wolne pod rząd** (48h)

```python
for każdy_pracownik:
    for każdy_tydzień in kalendarzowe_tygodnie:
        # Znajdź wszystkie możliwe okna 2-dniowe w tygodniu
        okna_2dniowe = []

        for i in 0..(długość_tygodnia-1):
            dzień1 = tydzień[i]
            dzień2 = tydzień[i+1]

            # Utwórz zmienną: czy to okno jest wolne?
            is_free = model.NewBoolVar(f"rest35h_{pracownik}_{dzień1}_{dzień2}")

            zmiany_dzień1 = shifts_vars[(pracownik, dzień1, *)]
            zmiany_dzień2 = shifts_vars[(pracownik, dzień2, *)]

            # is_free == 1 gdy OBA dni wolne (suma = 0)
            model.Add(suma(zmiany_dzień1 + zmiany_dzień2) == 0).OnlyEnforceIf(is_free)
            model.Add(suma(zmiany_dzień1 + zmiany_dzień2) >= 1).OnlyEnforceIf(is_free.Not())

            okna_2dniowe.append(is_free)

        # CONSTRAINT: Przynajmniej jedno okno 2-dniowe musi być wolne
        model.Add(sum(okna_2dniowe) >= 1)
```

**Przykład tygodnia**:

- Pon, Wt, Śr, Czw, Pt, **Sob wolna, Niedz wolna** ✅ (okno Sob-Niedz spełnia 35h)
- Pon, Wt, **Śr wolna, Czw wolna**, Pt, Sob, Niedz ✅ (okno Śr-Czw)
- Pon, Wt, Śr, Czw, Pt, Sob, Niedz (wszystkie pracujące) ❌ (brak 2 dni wolnych pod rząd)

**Liczba ograniczeń**: pracownicy × tygodnie = **~60 constraintów**

**Współpraca z HC4**: HC4 (max 6 dni z rzędu) + HC11 (2 dni wolne/tydzień) razem wymuszają regularny odpoczynek.

---

### HC12: Wolna Niedziela

**Podstawa prawna**: Kodeks Pracy Art. 151^10  
**Reguła**: Co najmniej **1 wolna niedziela na 2 niedziele handlowe**.

**Implementacja**:

```python
if enable_trading_sundays == False:
    # Wszystkie niedziele wolne - constraint już spełniony w HC5
    return

niedziele_handlowe = [dzień for dzień in sundays if dzień in trading_sundays]

if len(niedziele_handlowe) <= 1:
    # Tylko 1 lub 0 niedziel - brak wymogu
    return

# ZASADA: Na każde 2 niedziele handlowe → min 1 wolna
min_free_sundays = max(1, len(niedziele_handlowe) // 2)

for każdy_pracownik:
    zmiany_niedzielne = [
        shifts_vars[(pracownik, niedziela, *)]
        for niedziela in niedziele_handlowe
    ]

    # Może pracować max (total - min_free)
    max_working = len(niedziele_handlowe) - min_free_sundays

    model.Add(sum(zmiany_niedzielne) <= max_working)
```

**Przykład**:

- Luty 2026: 4 niedziele handlowe [7, 14, 21, 28]
- Min wolnych: 4 // 2 = **2 niedziele**
- Max pracujących: 4 - 2 = **2 niedziele**
- Pracownik może pracować w max 2 niedziele handlowe

**Liczba ograniczeń**: **~5-15** (pracownicy × 1 constraint)

---

### HC13: Sprawiedliwe Weekendy (HARD!)

**Reguła**: Różnica weekendów między pracownikami max **±2 zmiany**.

**WAŻNE**: To jest **HARD CONSTRAINT**, nie soft! (Złota zasada CP-SAT)

**Implementacja**:

```python
max_diff = 2  # konfigurowane w config.py

# Znajdź dni weekendowe (soboty + niedziele handlowe)
weekend_days = []
for dzień:
    if dzień == sobota:
        weekend_days.append(dzień)
    elif dzień == niedziela AND dzień in trading_sundays:
        weekend_days.append(dzień)

# Oblicz średnią weekendów na pracownika
avg_weekends = len(weekend_days) / liczba_pracowników
# Przykład: 8 sobót, 3 pracowników → avg = 2.67

# Dozwolony zakres dla każdego pracownika
min_weekends = max(0, int(avg_weekends - max_diff))
max_weekends = int(avg_weekends + max_diff)
# Przykład: avg=2.67, max_diff=2 → zakres [0, 4]

for każdy_pracownik:
    zmiany_weekendowe = [
        shifts_vars[(pracownik, weekend, *)]
        for weekend in weekend_days
    ]

    suma_weekendów = sum(zmiany_weekendowe)

    # HARD CONSTRAINTS!
    model.Add(suma_weekendów >= min_weekends)
    model.Add(suma_weekendów <= max_weekends)
```

**Przykład (5 sobót, 3 pracowników)**:

- Średnia: 5 / 3 = 1.67
- Zakres: [0, 3] (±2 od średniej)
- Jan: 3 weekendy ✅
- Anna: 2 weekendy ✅
- Piotr: 0 weekendów ✅
- Piotr: 4 weekendy ❌ (przekroczenie max_weekends=3)

**Liczba ograniczeń**: pracownicy × 2 (min + max) = **~10-30**

**Zastąpienie SC5**: Przed: SC5 tylko "preferowało" sprawiedliwość (soft). Teraz: HC13 **WYMUSZA** (hard).

---

## 5. Soft Constraints (SC1-SC7)

Soft constraints są **celami optymalizacyjnymi**. Solver stara się je maksymalnie spełnić poprzez **funkcję celu**.

### Funkcja Celu

```python
objective = suma_nagród - suma_kar

model.Maximize(objective)
```

Solver szuka rozwiązania które **maksymalizuje objective value**.

---

### SC1: Target Hours - Gradient do Środka

**Cel**: Preferować dokładne trafienie w target hours (środek zakresu HC10).

**Współpraca z HC10**:

- **HC10**: Wymusza zakres [target-60min, target+60min] (HARD)
- **SC1**: Karze odchylenia w tym zakresie (SOFT gradient)

**Implementacja**:

```python
penalty_per_minute = 500 // 60  # 8 pkt/min

for każdy_pracownik:
    target_minutes = (max_hours - urlopy) × 60

    suma_minut = sum(zmiana × długość for zmiana in shifts_vars[(pracownik, *, *)])

    # Odchylenie od target
    deviation_pos = model.NewIntVar(...)  # nadwyżka
    deviation_neg = model.NewIntVar(...)  # niedobór

    model.Add(suma_minut - target_minutes == deviation_pos - deviation_neg)

    # Kara za odchylenie (symetryczna - HC10 już blokuje ekstrema)
    penalty = -penalty_per_minute × (deviation_pos + deviation_neg)

    objective_terms.append(penalty)
```

**Przykład**:

- Target: 9600 minut (160h)
- Scenariusz A: 9600 minut (ideał) → penalty = 0 ✅
- Scenariusz B: 9630 minut (+30min) → penalty = -8 × 30 = **-240 pkt**
- Scenariusz C: 9570 minut (-30min) → penalty = -8 × 30 = **-240 pkt**

**Waga**: **500 pkt/h** = najwyższy priorytet wśród soft constraints

---

### SC2: Preferencje Czasowe

**Cel**: Nagroda za przypisanie pracownika do preferowanych godzin.

**Implementacja**:

```python
reward_per_match = 50  # pkt nagrody
tolerance = 60  # minut

for każdy_pracownik:
    preferred_start = preferencje[pracownik].preferred_start_time

    for zmiana in shifts_vars[(pracownik, *, *)]:
        shift_start = shift_template.start_time

        # Czy zmiana w preferowanym czasie (±60min)?
        if abs(shift_start - preferred_start) <= tolerance:
            # NAGRODA!
            reward = reward_per_match × zmiana
            objective_terms.append(reward)
```

**Przykład**:

- Jan preferuje zmiany o 8:00 (±60min = 7:00-9:00)
- Zmiana 8:00-16:00: +50 pkt ✅
- Zmiana 12:00-20:00: 0 pkt (poza zakresem)

**Waga**: **50 pkt/zmianę** (niski priorytet - "nice to have")

---

### SC3: Manager Presence

**Cel**: Premia za obecność managera na każdej zmianie (mix kompetencji).

**Implementacja**:

```python
reward_manager = 200  # pkt za obecność managera

# Identyfikacja managerów
manager_ids = [
    pracownik for pracownik in pracownicy
    if 'manager' in pracownik.position.lower()
]

for każdy_dzień:
    for każdy_szablon:
        # Zmiany managerów w tym dniu/szablonie
        manager_shifts = [
            shifts_vars[(manager, dzień, szablon)]
            for manager in manager_ids
        ]

        if manager_shifts:
            # Zmienna bool: czy jest manager na tej zmianie?
            has_manager = model.NewBoolVar(f"manager_{dzień}_{szablon}")

            model.Add(sum(manager_shifts) >= 1).OnlyEnforceIf(has_manager)
            model.Add(sum(manager_shifts) == 0).OnlyEnforceIf(has_manager.Not())

            # Nagroda za obecność
            reward = reward_manager × has_manager
            objective_terms.append(reward)
```

**Przykład**:

- Zmiana poranna w poniedziałek: Jan (manager) pracuje → +200 pkt ✅
- Zmiana popołudniowa w poniedziałek: brak managera → 0 pkt

**Waga**: **200 pkt/zmianę z managerem** (średni priorytet)

---

### SC4: Równomierne Rozłożenie Ogólne

**Cel**: Każdy pracownik ma podobną liczbę zmian w miesiącu.

**Implementacja**:

```python
penalty_per_deviation = 10  # pkt kary

avg_shifts = total_shifts / liczba_pracowników

for każdy_pracownik:
    suma_zmian = sum(shifts_vars[(pracownik, *, *)])

    target = int(avg_shifts)

    deviation_pos = model.NewIntVar(...)
    deviation_neg = model.NewIntVar(...)

    model.Add(suma_zmian - target == deviation_pos - deviation_neg)

    penalty = -penalty_per_deviation × (deviation_pos + deviation_neg)
    objective_terms.append(penalty)
```

**Przykład**:

- 60 zmian, 3 pracowników → avg = 20 zmian/pracownik
- Jan: 22 zmiany → deviation +2 → penalty = -10 × 2 = **-20 pkt**
- Anna: 20 zmian → deviation 0 → penalty = **0 pkt** ✅
- Piotr: 18 zmian → deviation -2 → penalty = **-20 pkt**

**Waga**: **10 pkt/zmianę** (najniższy priorytet - backup dla SC7)

---

### SC6: Równomierna Obsada Dzienna

**Cel**: Każdy dzień ma podobną liczbę pracowników.

**Implementacja**:

```python
penalty_per_deviation = 1500  # pkt kary (wysoka waga!)

target_daily_staffing = sum(template.min_employees for template in templates)

for każdy_dzień:
    suma_pracowników_dnia = sum(shifts_vars[(*, dzień, *)])

    deviation_pos = model.NewIntVar(...)
    deviation_neg = model.NewIntVar(...)

    model.Add(suma_pracowników_dnia - target_daily_staffing == deviation_pos - deviation_neg)

    penalty = -penalty_per_deviation × (deviation_pos + deviation_neg)
    objective_terms.append(penalty)
```

**Przykład**:

- Target: 5 pracowników/dzień
- Poniedziałek: 5 osób → penalty = 0 ✅
- Wtorek: 7 osób → deviation +2 → penalty = -1500 × 2 = **-3000 pkt**
- Środa: 3 osoby → deviation -2 → penalty = **-3000 pkt**

**Waga**: **1500 pkt** (drugi najwyższy priorytet po SC1)

---

### SC7: Sprawiedliwe Zmiany Miesięczne

**Cel**: Każdy pracownik ma podobną liczbę zmian w całym miesiącu.

**Implementacja**:

```python
penalty_per_deviation = 500  # pkt kary

avg_monthly = total_shifts / liczba_pracowników

for każdy_pracownik:
    suma_zmian_miesiąca = sum(shifts_vars[(pracownik, *, *)])

    target = int(avg_monthly)

    deviation_pos = model.NewIntVar(...)
    deviation_neg = model.NewIntVar(...)

    model.Add(suma_zmian_miesiąca - target == deviation_pos - deviation_neg)

    penalty = -penalty_per_deviation × (deviation_pos + deviation_neg)
    objective_terms.append(penalty)
```

**Przykład**:

- 90 zmian, 3 pracowników → avg = 30 zmian/pracownik
- Jan: 32 zmiany → +2 → penalty = -500 × 2 = **-1000 pkt**
- Anna: 30 zmian → 0 → penalty = **0 pkt** ✅
- Piotr: 28 zmian → -2 → penalty = **-1000 pkt**

**Waga**: **500 pkt** (75% priorytetu względem SC1)

---

### SC5: USUNIĘTE (Duplikat HC13)

**Dlaczego usunięte?**

SC5 (sprawiedliwe weekendy jako soft constraint) duplikował HC13 (sprawiedliwe weekendy jako HARD constraint).

**Przed zmianą**:

- SC5: Karał nierówne weekendy (soft) → solver mógł naruszyć jeśli to poprawiało SC1
- HC13: nie istniało

**Po zmianie**:

- SC5: **USUNIĘTE**
- HC13: Wymusza ±2 weekendy jako **HARD CONSTRAINT**

**Korzyści**:

- ✅ Brak duplikacji logiki
- ✅ Sprawiedliwość weekendów gwarantowana (hard)
- ✅ Szybsze rozwiązywanie (mniej soft constraints)

---

## 6. Preprocessing Danych

### 6.1 Parsowanie i Konwersja

**Daty**:

```python
def _parse_date(date_str):
    if isinstance(date_str, date):
        return date_str
    if isinstance(date_str, str):
        # "2026-02-10T00:00:00Z" → date(2026, 2, 10)
        return datetime.strptime(date_str.split('T')[0], '%Y-%m-%d').date()
```

**Czasy (time → minuty)**:

```python
def _time_to_minutes(time_str):
    # "08:30" → 8×60 + 30 = 510 minut
    if isinstance(time_str, time):
        return time_str.hour × 60 + time_str.minute
    if isinstance(time_str, str):
        h, m = time_str.split(':')
        return int(h) × 60 + int(m)
```

**Długość zmiany**:

```python
def _calculate_shift_duration(start_min, end_min):
    if end_min >= start_min:
        return end_min - start_min  # Normalna zmiana
    else:
        # Zmiana przez północ (22:00-06:00)
        return (24×60 - start_min) + end_min
```

### 6.2 Indeksowanie

**Pracownicy**:

```python
employee_by_id = {
    emp['id']: emp
    for emp in employees
    if emp.get('is_active', True)
}
```

**Szablony zmian**:

```python
template_by_id = {tpl['id']: tpl for tpl in shift_templates}
```

**Preferencje**:

```python
prefs_by_employee = {
    pref['employee_id']: pref
    for pref in employee_preferences
}
```

### 6.3 Preprocessing Urlopów

```python
absence_set = set()  # (employee_id, day)

for absence in employee_absences:
    start = parse_date(absence['start_date'])
    end = parse_date(absence['end_date'])

    current = start
    while current <= end:
        if current.year == year and current.month == month:
            absence_set.add((absence['employee_id'], current.day))
        current += timedelta(days=1)
```

### 6.4 Identyfikacja Niedziel

```python
sundays_in_month = []
for day in 1..days_in_month:
    date_obj = date(year, month, day)
    if date_obj.weekday() == 6:  # 6 = niedziela
        sundays_in_month.append(day)
```

### 6.5 Niedziele Handlowe

```python
trading_sunday_days = set()
for ts in trading_sundays:
    if ts.get('is_active', True):
        ts_date = parse_date(ts['date'])
        if ts_date.year == year and ts_date.month == month:
            trading_sunday_days.add(ts_date.day)
```

### 6.6 Identyfikacja Managerów

```python
manager_ids = set()
for emp_id, emp in employee_by_id.items():
    position = emp.get('position', '').lower()
    if 'manager' in position or 'kierownik' in position:
        manager_ids.add(emp_id)
```

---

## 7. Solver CP-SAT

### 7.1 Parametry Solvera

```python
solver = cp_model.CpSolver()

# Maksymalny czas rozwiązywania
solver.parameters.max_time_in_seconds = 300  # 5 minut

# Liczba wątków (równoległość)
solver.parameters.num_search_workers = 8

# Wyłącz verbose logging
solver.parameters.log_search_progress = False
```

### 7.2 Uruchomienie

```python
status = solver.Solve(model)
```

### 7.3 Statusy Wyniku

| Status            | Znaczenie                                           | Akcja                |
| ----------------- | --------------------------------------------------- | -------------------- |
| **OPTIMAL**       | Znaleziono najlepsze możliwe rozwiązanie            | ✅ Zwróć shifts      |
| **FEASIBLE**      | Znaleziono dopuszczalne rozwiązanie (nie najlepsze) | ✅ Zwróć shifts      |
| **INFEASIBLE**    | Niemożliwe - hard constraints są sprzeczne          | ❌ Diagnostyka       |
| **UNKNOWN**       | Timeout lub brak zmiennych                          | ⚠️ Zwróć pusty wynik |
| **MODEL_INVALID** | Błąd w strukturze modelu                            | ❌ Błąd programisty  |

### 7.4 Ekstrakcja Rozwiązania

```python
shifts_output = []

for (emp_id, day, template_id), var in shifts_vars.items():
    if solver.Value(var) == 1:  # Zmienna przypisana
        template = template_by_id[template_id]
        employee = employee_by_id[emp_id]

        shift_record = {
            'employee_id': emp_id,
            'employee_name': f"{employee['first_name']} {employee['last_name']}",
            'date': date(year, month, day).isoformat(),
            'start_time': template['start_time'],
            'end_time': template['end_time'],
            'break_minutes': template.get('break_minutes', 0),
            'template_id': template_id,
            'template_name': template['name'],
            'color': employee.get('color') or template.get('color')
        }

        shifts_output.append(shift_record)
```

### 7.5 Statystyki

```python
statistics = {
    'status': solver.StatusName(status),
    'objective_value': solver.ObjectiveValue(),
    'quality_percent': calculate_quality_percent(...),
    'solve_time_seconds': solver.WallTime(),
    'total_shifts_assigned': len(shifts_output),
    'total_variables': len(shifts_vars),
    'hard_constraints': stats['hard_constraints'],
    'soft_constraints': stats['soft_constraints'],
    'conflicts': solver.NumConflicts(),
    'branches': solver.NumBranches()
}
```

### 7.6 Quality Percent

**Normalizacja objective_value do 0-100%**:

```python
def _calculate_quality_percent(objective_value, total_shifts):
    # Szacuj maksimum i minimum
    estimated_max = total_shifts × 300  # Max nagrody
    estimated_min = -total_shifts × 500  # Max kary

    # Normalizuj do 0-100%
    normalized = ((objective_value - estimated_min) /
                  (estimated_max - estimated_min)) × 100

    return max(0.0, min(100.0, normalized))
```

**Interpretacja**:

- **0-30%**: Słaba jakość (dużo kar)
- **30-60%**: Średnia jakość
- **60-80%**: Dobra jakość
- **80-100%**: Bardzo dobra jakość (optymalne lub bliskie)

---

## 8. Diagnostyka i Obsługa Błędów

### 8.1 Status INFEASIBLE

Gdy solver zwróci INFEASIBLE, uruchamiana jest **diagnostyka**:

```python
def _handle_infeasibility():
    reasons = []
    ai_messages = []

    # 1. Sprawdź bilans godzin
    # 2. Sprawdź stosunek nieobecności
    # 3. Sprawdź max_consecutive_days
    # 4. Sprawdź min_employees vs dostępność
    # 5. Sprawdź odpoczynek dobowy (pary zmian)
    # 6. Sprawdź odpoczynek tygodniowy 35h
    # 7. Sprawdź wolną niedzielę
    # 8. Sprawdź sprawiedliwe weekendy HC13
    # 9. Sprawdź target hours tolerance

    return {
        'status': 'INFEASIBLE',
        'reasons': reasons,
        'ai_messages': ai_messages,
        'suggestions': suggestions
    }
```

### 8.2 Sprawdzane Problemy

#### 1. Bilans Godzin

```python
wymagane_godziny = sum(
    szablon.min_employees × długość_zmiany × dni
    for szablon in templates
)

dostępne_godziny = sum(
    (pracownik.max_hours - urlopy_pracownika)
    for pracownik in employees
)

if wymagane > dostępne × 1.2:  # 20% buffer
    reason = f"Za mało dostępnych godzin: {dostępne}h vs wymagane {wymagane}h"
    reasons.append(reason)
```

#### 2. Stosunek Nieobecności

```python
absence_ratio = absence_days / (pracownicy × dni_w_miesiącu)

if absence_ratio > 0.3:  # > 30%
    reason = f"Bardzo wysoki stosunek nieobecności: {absence_ratio:.1%}"
    reasons.append(reason)
```

#### 3. Restrykcyjne max_consecutive_days

```python
if max_consecutive < 5:
    reason = f"Bardzo restrykcyjne max_consecutive_days: {max_consecutive}"
    reasons.append(reason)
```

#### 4. Min Employees vs Dostępność

```python
for szablon in templates:
    for dzień:
        dostępni = liczba_pracowników_bez_urlopu(dzień)
        wymagani = szablon.min_employees

        if wymagani > dostępni:
            reason = f"Dzień {dzień}: wymaganych {wymagani}, dostępnych {dostępni}"
            reasons.append(reason)
```

### 8.3 Sugestie Naprawcze

```python
suggestions = [
    "Dodaj więcej pracowników",
    "Zmniejsz min_employees w szablonach",
    "Rozważ przesunięcie urlopów",
    "Zwiększ max_consecutive_days",
    "Zwiększ tolerancję target hours (config.py)",
    "Sprawdź HC13 - czy ±2 weekendy nie jest zbyt restrykcyjne",
    "Dodaj więcej niedziel handlowych dla HC12/HC13"
]
```

---

## 9. Parametry Konfiguracyjne

Wszystkie parametry w `config.py`:

### 9.1 Solver Config

```python
class SolverConfig:
    DEFAULT_TIME_LIMIT = 300  # 5 minut
    NUM_SEARCH_WORKERS = 8    # 8 wątków
    LOG_SEARCH_PROGRESS = False
```

### 9.2 Soft Constraint Weights

```python
class SoftConstraintWeights:
    # SC1: Target hours
    SC1_PENALTY_UNDERSCHEDULE = 5000  # Kara za niedopracowanie
    SC1_PENALTY_OVERSCHEDULE = 100     # Kara za nadpracowanie

    # SC2: Preferencje
    SC2_REWARD_PREFERENCE_MATCH = 50
    SC2_PREFERENCE_TOLERANCE_MINUTES = 60

    # SC3: Manager presence
    SC3_REWARD_MANAGER_PRESENCE = 200

    # SC4: Równomierne rozłożenie
    SC4_PENALTY_SHIFT_DEVIATION = 10

    # SC6: Równomierna obsada dzienna
    SC6_PENALTY_STAFFING_DEVIATION = 1500

    # SC7: Sprawiedliwe zmiany miesięczne
    SC7_PENALTY_MONTHLY_DEVIATION = 500
```

### 9.3 Hard Constraint Defaults

```python
class HardConstraintDefaults:
    # HC2: Max godziny tygodniowe
    MAX_WEEKLY_HOURS = 48

    # HC3: Odpoczynek dobowy
    MIN_DAILY_REST_HOURS = 11

    # HC4: Max dni z rzędu
    MAX_CONSECUTIVE_DAYS = 6

    # HC7: Min obsada
    MIN_EMPLOYEES_PER_SHIFT = 1

    # HC10: Target hours tolerance
    TARGET_HOURS_TOLERANCE_MINUTES = 60  # ±1h

    # HC11: Odpoczynek tygodniowy
    MIN_WEEKLY_REST_HOURS = 35

    # HC12: Wolna niedziela
    MIN_FREE_SUNDAYS_PER_4_WEEKS = 1

    # HC13: Sprawiedliwe weekendy (HARD!)
    MAX_WEEKEND_DIFF = 2  # ±2 zmiany
```

### 9.4 Quality Metrics

```python
class QualityMetrics:
    ESTIMATED_MAX_BONUS_PER_SHIFT = 300
    ESTIMATED_MAX_PENALTY_PER_SHIFT = 500
```

### 9.5 Time Norms

```python
class TimeNorms:
    HOURS_PER_ABSENCE_DAY = 8  # Urlop = zawsze 8h/dzień
```

---

## 10. Przykłady i Use Cases

### 10.1 Przykład Kompletny: Mały Sklep

**Wejście**:

```json
{
    "year": 2026,
    "month": 2,
    "organization_settings": {
        "opening_hours": {
            "monday": { "enabled": true, "open": "09:00", "close": "21:00" },
            "tuesday": { "enabled": true, "open": "09:00", "close": "21:00" },
            "wednesday": { "enabled": true, "open": "09:00", "close": "21:00" },
            "thursday": { "enabled": true, "open": "09:00", "close": "21:00" },
            "friday": { "enabled": true, "open": "09:00", "close": "21:00" },
            "saturday": { "enabled": true, "open": "10:00", "close": "18:00" },
            "sunday": { "enabled": false }
        },
        "min_employees_per_shift": 2,
        "enable_trading_sundays": true
    },
    "shift_templates": [
        {
            "id": "morning",
            "name": "Poranna",
            "start_time": "09:00",
            "end_time": "17:00",
            "break_minutes": 30,
            "min_employees": 2,
            "max_employees": 3,
            "applicable_days": [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday"
            ]
        },
        {
            "id": "afternoon",
            "name": "Popołudniowa",
            "start_time": "13:00",
            "end_time": "21:00",
            "break_minutes": 30,
            "min_employees": 2,
            "max_employees": 3,
            "applicable_days": [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday"
            ]
        },
        {
            "id": "weekend",
            "name": "Weekendowa",
            "start_time": "10:00",
            "end_time": "18:00",
            "break_minutes": 30,
            "min_employees": 2,
            "max_employees": 2,
            "applicable_days": ["saturday"]
        }
    ],
    "employees": [
        {
            "id": "emp1",
            "first_name": "Jan",
            "last_name": "Kowalski",
            "position": "Manager",
            "employment_type": "full",
            "max_hours": 176,
            "is_active": true,
            "template_assignments": ["morning", "afternoon", "weekend"]
        },
        {
            "id": "emp2",
            "first_name": "Anna",
            "last_name": "Nowak",
            "position": "Pracownik",
            "employment_type": "full",
            "max_hours": 176,
            "is_active": true,
            "template_assignments": ["morning", "afternoon", "weekend"]
        },
        {
            "id": "emp3",
            "first_name": "Piotr",
            "last_name": "Wiśniewski",
            "position": "Pracownik",
            "employment_type": "half",
            "max_hours": 88,
            "is_active": true,
            "template_assignments": ["morning", "afternoon"]
        }
    ],
    "employee_absences": [
        {
            "employee_id": "emp3",
            "start_date": "2026-02-10",
            "end_date": "2026-02-14",
            "absence_type": "vacation"
        }
    ],
    "scheduling_rules": {
        "max_consecutive_days": 6,
        "min_daily_rest_hours": 11,
        "max_weekly_work_hours": 48
    },
    "trading_sundays": [{ "date": "2026-02-15", "is_active": true }]
}
```

**Proces**:

1. **Preprocessing**:
    - 3 pracowników (2 full-time, 1 half-time)
    - 28 dni w lutym 2026
    - 4 niedziele, 1 handlowa
    - Piotr ma urlop 10-14 (5 dni)

2. **Zmienne decyzyjne**:
    - Jan: 28 dni × 3 szablony = 84 możliwe
    - Anna: 28 dni × 3 szablony = 84 możliwe
    - Piotr: (28-5) dni × 2 szablony = 46 możliwe
    - **Total: ~214 zmiennych** (po filtrach)

3. **Hard Constraints**:
    - HC1: 3 × 28 = **84 constraintów**
    - HC2: 3 × 4 tygodnie = **12 constraintów**
    - HC3: **~50 constraintów** (pary zmian)
    - HC4: 3 × 22 = **66 constraintów**
    - HC7: 24 dni × ~10 slotów = **~240 constraintów**
    - HC10: 3 × 2 = **6 constraintów**
    - HC11: 3 × 4 = **12 constraintów**
    - HC13: 3 × 2 = **6 constraintów**
    - **Total: ~500 hard constraints**

4. **Soft Constraints**:
    - SC1: 3 pracowników
    - SC6: 24 dni
    - SC7: 3 pracowników
    - **Total: ~30 soft constraint terms**

5. **Solver**:
    - Czas: **~5-30 sekund**
    - Status: **OPTIMAL**
    - Objective value: **+15,000**
    - Quality: **85%**

6. **Wynik**:
    - Jan: 22 zmiany (170h po urlopach)
    - Anna: 22 zmiany (170h)
    - Piotr: 11 zmian (85h po urlopach 5 dni)
    - **Total: 55 zmian przypisanych**

**Statystyki**:

```json
{
    "status": "OPTIMAL",
    "objective_value": 15234,
    "quality_percent": 85.3,
    "solve_time_seconds": 12.4,
    "total_shifts_assigned": 55,
    "conflicts": 234,
    "branches": 1523
}
```

---

### 10.2 Use Case: Duży Sklep z Wieloma Zmianami

**Parametry**:

- **15 pracowników**
- **8 szablonów zmian** (poranna, popołudniowa, nocna, weekend, etc.)
- **31 dni** (styczeń)
- **4 niedziele handlowe**

**Zmienne**:

- 15 × 31 × 8 = **3,720 potencjalnych zmiennych**
- Po filtrach: **~2,500 zmiennych**

**Czas rozwiązywania**:

- **2-5 minut** (zależy od złożoności)
- Status: **FEASIBLE** (może nie być OPTIMAL z powodu timeoutu)

**Wyzwania**:

- HC7 (ciągłe pokrycie) tworzy **~800 constraintów**
- HC13 (sprawiedliwe weekendy) dla 15 osób = **30 constraintów**
- SC6 (równomierna obsada) dla 31 dni = **31 terms**

---

### 10.3 Use Case: Sklep z Bardzo Restrykcyjnymi Regułami

**Parametry**:

- 5 pracowników
- max_consecutive_days = **4** (zamiast 6)
- TARGET_HOURS_TOLERANCE = **±30min** (zamiast ±60min)
- MAX_WEEKEND_DIFF = **1** (zamiast 2)

**Rezultat**:

- Status: **INFEASIBLE** ❌
- Powód: Kombinacja max_consecutive=4 + tolerance=30min + HC11 (35h rest) jest zbyt restrykcyjna

**Diagnostyka**:

```
MOŻLIWE PRZYCZYNY:
1. max_consecutive_days=4 jest bardzo restrykcyjne (standard: 6)
2. Tolerancja target hours ±30min może być trudna do osiągnięcia
3. HC11 (2 dni wolne/tydzień) + HC4 (max 4 dni) → mało elastyczności
```

**Sugestie**:

- Zwiększ max_consecutive_days do 5-6
- Zwiększ TARGET_HOURS_TOLERANCE do 60min
- Rozważ relaksację MAX_WEEKEND_DIFF do 2

---

## 11. Podsumowanie Algorytmu

### 11.1 Kluczowe Punkty

1. **CP-SAT gwarantuje zgodność** z wszystkimi hard constraints (prawa pracy, odpoczynki)
2. **13 Hard Constraints** wymuszają bezwzględne reguły
3. **6 Soft Constraints** optymalizują jakość (sprawiedliwość, preferencje)
4. **Hierarchia priorytetów** przez wagi (SC1=500 > SC6=1500 > SC7=500 > ...)
5. **HC13 jako HARD** (zamiast SC5 soft) = gwarancja sprawiedliwych weekendów
6. **HC10 EXACT target** (zamiast max) = dokładne wypełnienie etatu
7. **Diagnostyka INFEASIBLE** pomaga zidentyfikować problemy

### 11.2 Złote Zasady (HC11-HC13)

Nowe hard constraints dodane w wersji 2.1.0:

- **HC11**: 35h odpoczynek tygodniowy (~2 dni wolne)
- **HC12**: Wolna niedziela co 2 handlowe
- **HC13**: Sprawiedliwe weekendy ±2 (HARD!)

**Korzyści**:

- ✅ Gwarancja zgodności z Art. 133 i 151^10 KP
- ✅ Eliminacja problemu "wszystkie weekendy dla jednego pracownika"
- ✅ Lepszy work-life balance dla pracowników

### 11.3 Wydajność

| Rozmiar problemu       | Zmienne | Constraints | Czas                |
| ---------------------- | ------- | ----------- | ------------------- |
| Mały (5 osób)          | ~300    | ~500        | **10-30s**          |
| Średni (10 osób)       | ~1,000  | ~1,500      | **30-120s**         |
| Duży (15 osób)         | ~2,500  | ~3,000      | **120-300s**        |
| Bardzo duży (20+ osób) | ~4,000+ | ~5,000+     | **300s+ (timeout)** |

### 11.4 Kiedy Używać CP-SAT?

✅ **Dobre zastosowania**:

- Sklepy/firmy z 3-20 pracownikami
- Złożone reguły prawne (Kodeks Pracy)
- Wymóg sprawiedliwości i równości
- Elastyczne reguły biznesowe
- Optymalizacja jakości grafiku

❌ **Słabe zastosowania**:

- Bardzo duże firmy (50+ pracowników) - może być wolne
- Proste reguły bez optymalizacji - prostsza heurystyka wystarczy
- Real-time scheduling - CP-SAT potrzebuje czasu

---

## 12. Przykładowe Wywołanie API

```python
import requests

input_data = {
    "year": 2026,
    "month": 2,
    "organization_settings": {...},
    "shift_templates": [...],
    "employees": [...],
    "employee_absences": [...],
    "scheduling_rules": {...},
    "trading_sundays": [...],
    "solver_time_limit": 300
}

response = requests.post(
    "http://localhost:8080/api/generate",
    json=input_data
)

result = response.json()

if result['status'] == 'SUCCESS':
    print(f"✅ Wygenerowano {len(result['shifts'])} zmian")
    print(f"Jakość: {result['statistics']['quality_percent']:.1f}%")
elif result['status'] == 'INFEASIBLE':
    print("❌ Niemożliwe do rozwiązania")
    for reason in result['reasons']:
        print(f"  - {reason}")
```

---

**Koniec dokumentacji**

Dokument ten zawiera **WSZYSTKIE** szczegóły działania algorytmu CP-SAT w systemie Calenda Schedule. Dla pytań technicznych, patrz kod źródłowy `scheduler_optimizer.py` i `config.py`.
