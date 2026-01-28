# Struktura Katalogu `src/lib`

Katalog `lib` jest sercem logiki biznesowej i narzędziowej aplikacji. Został podzielony na moduły, aby oddzielić kod domenowy od technicznego.

## Główne Katalogi

### 1. `core/` (Logika Domenowa)

Tutaj znajduje się czysta logika biznesowa podzielona na domeny. Pliki w tym katalogu **nie powinny zależeć od Reacta** (poza sporadycznymi wyjątkami) ani od warstwy UI.

-   `employees/`: Logika związana z pracownikami (obliczanie stawek, formatowanie nazwisk).
-   `schedule/`: Logika grafiku (walidacje reguł kodeksu pracy, generator zmian, sprawdzanie dostępności).
-   `organization/`: Logika ustawień firmowych.

Każdy z tych podkatalogów zazwyczaj zawiera plik `utils.ts` lub konkretne pliki z funkcjami (np. `work-hours.ts`).

### 2. `services/` (Warstwa Usług)

Serwisy to warstwa wyższego poziomu, która może łączyć dane z wielu domen lub wykonywać bardziej złożone operacje (często asynchroniczne).

-   `dashboard.service.ts`: Przykład serwisu agregującego dane dla panelu głównego.

### 3. `actions/` (Server Actions)

Tutaj znajdują się akcje serwerowe Next.js (`use server`).
Każda akcja powinna używać wrappera `authenticatedAction` (z `safe-action.ts`), aby zapewnić spójną walidację, autoryzację i obsługę błędów.

### 4. `hooks/` (React Hooks)

Generyczne hooki Reacta, które nie są ściśle związane z jednym konkretnym "featurem" UI.
Przykłady: `use-local-storage`, `use-debate`, `use-resize-observer`.
_Uwaga: Hooki specyficzne dla domeny (np. `useScheduleState`) trzymamy w `components/features/<domena>/hooks/`._

### 5. `utils/` (Narzędzia Ogólne)

Funkcje pomocnicze, które są całkowicie agnostyczne domenowo. Mogłyby być skopiowane do innego projektu i nadal działać.
Przykłady:

-   `date-helpers.ts`: Formatowanie dat.
-   `cn.ts`: Łączenie klas CSS (Tailwind).
-   `logger.ts`: Logger środowiskowy.

### 6. `supabase/`

Konfiguracja klienta Supabase (Client Component Client, Server Component Client, Middleware Client).
**Ważne:** Używaj `createClient` z odpowiedniego pliku w zależności od kontekstu (Client vs Server).

### 7. `repositories/` (Dostęp do Danych)

Warstwa abstrakcji nad zapytaniami do bazy danych. Komponenty UI powinny korzystać z hooków (SWR/React Query) lub Server Actions, które z kolei używają Repozytoriów, zamiast wołać Supabase bezpośrednio w złożonych przypadkach.
