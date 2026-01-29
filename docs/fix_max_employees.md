# Fix: max_employees Validation

## Problem

Pole `max_employees` w tabeli `shift_templates` mogło przyjmować wartość 0, co nie ma sensu biznesowego - maksymalna liczba pracowników powinna być albo NULL (bez limitu) albo >= 1.

## Rozwiązanie

### 1. Baza danych

- **Migracja**: `supabase/migrations/20260129_fix_max_employees_constraint.sql`
    - Aktualizuje istniejące rekordy gdzie `max_employees = 0` na `NULL`
    - Dodaje constraint `CHECK (max_employees IS NULL OR max_employees >= 1)`
    - Dodaje komentarz dokumentujący kolumnę

### 2. Frontend - Walidacja formularzy

#### Dialog edycji szablonów zmian

- **Plik**: `src/components/features/schedule/dialogs/shift-template-dialog.tsx`
- Zmieniono `min={0}` na `min={1}`
- Zmieniono placeholder z `∞` na `Bez limitu`
- Dodano walidację w onChange: jeśli wartość = 0, ustawia NULL

#### Wizard onboardingu

- **Plik**: `src/components/features/setup/wizard/shift-templates-step.tsx`
- Zmieniono `min` z dynamicznego `template.minEmployees || 0` na `1`
- Placeholder: `Bez limitu`

#### Zapis do bazy w wizardzie

- **Plik**: `src/components/features/setup/onboarding-wizard.tsx`
- Zmieniono `max_employees: template.maxEmployees || 0`
- Na: `max_employees: template.maxEmployees && template.maxEmployees > 0 ? template.maxEmployees : null`

### 3. Schemat bazy

- **Plik**: `supabase/full_database_schema.sql`
- Zaktualizowano definicję `shift_templates` z dodanym constraint
- Dodano komentarz dokumentujący kolumnę

## Rezultat

✅ Niemożliwe jest ustawienie `max_employees = 0` zarówno w UI jak i w bazie danych
✅ Użytkownik może wybrać:

- Puste pole (NULL) = bez limitu
- Wartość >= 1 = konkretny limit pracowników
  ✅ Build przechodzi pomyślnie
  ✅ Backward compatible - istniejące wartości 0 są automatycznie konwertowane na NULL
