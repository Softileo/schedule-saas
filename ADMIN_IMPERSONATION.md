# Admin Impersonation - Dokumentacja

## Opis funkcjonalności

System impersonation pozwala administratorom na zalogowanie się do dowolnej organizacji w systemie, aby pomóc użytkownikom w rozwiązaniu problemów. Administrator widzi wszystko oczami użytkownika - ma pełny dostęp do organizacji, jej pracowników, grafików i wszystkich innych zasobów.

## Jak używać

### 1. Zaloguj się do panelu admina

Wejdź na `/admin/logowanie` i zaloguj się jako administrator.

### 2. Przejdź do listy organizacji

W panelu admina kliknij kartę **"Organizacje"** lub przejdź bezpośrednio do `/admin/organizacje`.

### 3. Znajdź organizację

- Użyj wyszukiwarki, aby znaleźć organizację po nazwie, emailu właściciela lub slug
- Lista pokazuje wszystkie organizacje w systemie z podstawowymi statystykami:
    - Nazwa organizacji i slug
    - Właściciel (imię i email)
    - Liczba członków
    - Liczba pracowników

### 4. Przełącz się na organizację

Kliknij przycisk **"Przełącz"** przy wybranej organizacji. Zostaniesz przekierowany do dashboardu tej organizacji.

### 5. Pracuj w trybie impersonation

Po przełączeniu się:

- Na górze strony pojawi się **żółty banner** informujący o trybie podglądu
- Banner pokazuje nazwę organizacji i właściciela
- Masz pełny dostęp do wszystkich funkcji organizacji:
    - Panel główny
    - Grafiki
    - Pracownicy
    - Szablony zmian
    - Ustawienia organizacji

### 6. Wyjdź z trybu podglądu

Aby wrócić do panelu admina, kliknij przycisk **"Wyjdź z podglądu"** w żółtym bannerze.

## Bezpieczeństwo

### Sesja impersonation

- Tryb impersonation jest zapisywany w cookies HTTP-only
- Sesja wygasa po 24 godzinach
- Po wylogowaniu admin automatycznie wychodzi z trybu impersonation

### Identyfikacja

- System zawsze wie, że jesteś w trybie admin impersonation
- Żółty banner jest zawsze widoczny podczas impersonation
- Nie można "zgubić się" w organizacji - zawsze można wrócić

### Audyt

Wszystkie akcje wykonywane w trybie impersonation są logowane jako działania admina w kontekście organizacji.

## Techniczne szczegóły

### API Endpoints

#### GET `/api/admin/organizations`

Pobiera listę wszystkich organizacji w systemie.

**Response:**

```json
{
    "organizations": [
        {
            "id": "uuid",
            "name": "Nazwa organizacji",
            "slug": "slug",
            "created_at": "timestamp",
            "owner_id": "uuid",
            "profiles": {
                "full_name": "Jan Kowalski",
                "email": "jan@example.com"
            },
            "membersCount": 5,
            "employeesCount": 15
        }
    ]
}
```

#### POST `/api/admin/switch-organization`

Przełącza admina do wybranej organizacji.

**Request:**

```json
{
    "organizationId": "uuid"
}
```

**Response:**

```json
{
    "success": true,
    "organization": {
        "id": "uuid",
        "name": "Nazwa organizacji",
        "slug": "slug"
    },
    "redirectUrl": "/panel?org=slug"
}
```

#### POST `/api/admin/exit-impersonation`

Wychodzi z trybu impersonation.

**Response:**

```json
{
    "success": true,
    "redirectUrl": "/admin"
}
```

#### GET `/api/admin/impersonation-status`

Sprawdza status impersonation.

**Response:**

```json
{
    "isImpersonating": true,
    "organization": {
        "id": "uuid",
        "name": "Nazwa organizacji",
        "slug": "slug",
        "profiles": {
            "full_name": "Jan Kowalski",
            "email": "jan@example.com"
        }
    }
}
```

### Cookies

- `admin-impersonation` - flaga czy admin jest w trybie impersonation (wartość: "true")
- `admin-impersonation-org` - ID organizacji do impersonacji
- `current_organization` - ID aktualnej organizacji (używane przez dashboard)

### Komponenty

- `AdminImpersonationBanner` - Banner widoczny w dashboard podczas impersonation
- `AdminOrganizationsPage` - Strona z listą organizacji w panelu admina

### Modyfikacje w kodzie

#### `getDashboardContext()`

Funkcja została zmodyfikowana, aby obsługiwać admin impersonation:

- Sprawdza cookies impersonation
- Jeśli admin impersonuje, pobiera organizację i symuluje dostęp
- Używa profilu właściciela organizacji jako kontekstu użytkownika

## FAQ

**Q: Czy użytkownik wie, że jestem w jego organizacji?**
A: Nie, użytkownik nie otrzymuje żadnego powiadomienia. System po prostu loguje twoje działania.

**Q: Czy mogę edytować dane w organizacji?**
A: Tak, masz pełny dostęp - możesz dodawać/edytować/usuwać pracowników, tworzyć grafiki, etc.

**Q: Co się stanie jeśli zapomnę wyjść z impersonation?**
A: Sesja impersonation wygasa po 24 godzinach. Dodatkowo, jeśli się wylogujesz, automatycznie wyjdziesz z impersonation.

**Q: Czy mogę impersonować wiele organizacji jednocześnie?**
A: Nie, możesz być zalogowany tylko do jednej organizacji w danym momencie.

**Q: Gdzie mogę zobaczyć historię impersonation?**
A: Obecnie nie ma dedykowanego interfejsu do przeglądania historii. Może to być dodane w przyszłości jako audit log.
