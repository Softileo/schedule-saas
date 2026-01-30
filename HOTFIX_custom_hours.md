# 🔧 HOTFIX: Poprawka Interpretacji custom_hours

## ❌ Problem

Otrzymywałeś błąd:

```
Za mało godzin pracowniczych (640h) na pokrycie wymaganych zmian (13624h)
```

**Przyczyna:** Błędna interpretacja pola `custom_hours` w bazie danych!

## 📊 Analiza Błędu

### Poprzednia (Błędna) Logika:

```typescript
// ❌ Zakładaliśmy że custom_hours = godziny DZIENNIE
if (employmentType === "custom" && customHours) {
    const customMonthlyHours = customHours * totalWorkableDays;
    // Przykład: custom_hours = 20 → 20 × 27 = 540h miesięcznie
}
```

### Problem:

- W bazie danych `custom_hours` przechowuje godziny **TYGODNIOWE** (nie dziennie!)
- Pracownik z 20h/tydzień był traktowany jak 540h/miesiąc (absurdalne!)
- To powodowało że algorytm myślał że mamy DUŻO więcej godzin niż w rzeczywistości

### Skutek:

- 5 pracowników × custom_hours=20 (tyg) × błąd → ~2700h dostępne (błędnie)
- Algorytm generował grafik zakładając 2700h
- W rzeczywistości mieli tylko ~540h
- Rezultat: **INFEASIBLE** bo brakuje 80% godzin!

## ✅ Rozwiązanie

### Nowa (Poprawna) Logika:

```typescript
// ✅ custom_hours = godziny TYGODNIOWE
if (employmentType === "custom" && customHours) {
    // Oblicz stosunek do pełnego etatu (40h/tyg)
    const weeklyRatio = customHours / 40;
    // Miesięczne godziny = norma × stosunek
    const customMonthlyHours = monthlyHoursNorm * weeklyRatio;
    // Przykład: custom_hours = 20 → (20/40) × 216h = 108h miesięcznie ✅
}
```

## 📐 Przykłady Obliczeń

Dla miesiąca z **216h normą** (27 dni roboczych):

| Employment Type | Custom Hours (tyg) | Obliczenie          | Max Hours  | Zmiana         |
| --------------- | ------------------ | ------------------- | ---------- | -------------- |
| `custom`        | 20h/tyg            | (20/40) × 216 × 1.2 | **129.6h** | ✅ Poprawne    |
| `custom`        | 30h/tyg            | (30/40) × 216 × 1.2 | **194.4h** | ✅ Poprawne    |
| `custom`        | 40h/tyg            | (40/40) × 216 × 1.2 | **259.2h** | ✅ = Full-time |

### Przed poprawką (BŁĄD):

| Custom Hours | Błędne Obliczenie | Błędny Wynik |
| ------------ | ----------------- | ------------ |
| 20h/tyg      | 20 × 27 dni × 1.2 | **648h** ❌  |
| 30h/tyg      | 30 × 27 dni × 1.2 | **972h** ❌  |

## 🔍 Weryfikacja Twojej Sytuacji

### Sprawdź swoich pracowników:

```sql
SELECT
    id,
    first_name,
    last_name,
    employment_type,
    custom_hours
FROM employees
WHERE employment_type = 'custom';
```

### Oczekiwane wartości:

- `custom_hours = 20` → Pracownik na 50% etatu (20h/40h)
- `custom_hours = 30` → Pracownik na 75% etatu (30h/40h)
- `custom_hours = 40` → Pracownik na 100% etatu (40h/40h)

## 🎯 Co To Zmienia dla Twojego Grafiku

### Jeśli masz 5 pracowników z custom_hours = 20:

**Przed poprawką:**

- System myślał: 5 × 648h = **3240h dostępne** ❌
- Generował grafik dla 3240h
- W rzeczywistości: tylko ~650h
- **Rezultat:** INFEASIBLE

**Po poprawce:**

- System wie: 5 × 129.6h = **648h dostępne** ✅
- Generuje grafik dla 648h
- Jeśli potrzebujesz więcej (np. 1300h), system powie:
    - "Potrzeba dodatkowych X pracowników" ✅
    - To jest POPRAWNY komunikat!

## 📝 Plik Zmieniony

- [`src/lib/scheduler/data-transformer.ts`](src/lib/scheduler/data-transformer.ts)
    - Funkcja: `calculateMaxMonthlyHours()`
    - Linie: 210-233

## 🧪 Test Po Poprawce

```typescript
// Test: Pracownik custom 20h/tydzień
const result = calculateMaxMonthlyHours("custom", 20, 216, 27);

// Przed: 540h miesięcznie ❌
// Po: 108h miesięcznie ✅
console.log(result.maxHours); // 129.6h (108 × 1.2 buffer)
```

## ✅ Status

- **Build:** ✅ Passes
- **TypeScript:** ✅ No errors
- **Logic:** ✅ Fixed
- **Ready:** ✅ Gotowe do użycia

## 💡 Następne Kroki

1. **Restart aplikacji:**

    ```bash
    npm run dev
    ```

2. **Spróbuj ponownie wygenerować grafik**

3. **Jeśli nadal INFEASIBLE:**
    - To znaczy że **rzeczywiście** masz za mało pracowników
    - Sprawdź komunikat błędu - powie Ci ile etatów brakuje
    - Dodaj więcej pracowników lub zwiększ im godziny

4. **Sprawdź employment_type pracowników:**
    ```sql
    SELECT employment_type, COUNT(*)
    FROM employees
    WHERE is_active = true
    GROUP BY employment_type;
    ```

---

**Data poprawki:** 2026-01-30  
**Typ:** Critical Bugfix  
**Wpływ:** Wszystkie organizacje z pracownikami typu `custom`
