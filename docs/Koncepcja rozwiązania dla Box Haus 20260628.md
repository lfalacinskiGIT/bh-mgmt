**Koncepcja rozwiązania dla Box Haus**

# Korzyści dla klienta

***

-   **Bieżąca informacja o ekonomice kontraktów.** System pozwoli szybciej oceniać rentowność realizacji, bez czekania na kwartalne raporty i ręczne analizy przygotowywane poza systemem.
-   **Pełniejszy obraz kosztu kontraktu.** Do kosztów widocznych dziś w magazynach wirtualnych zostaną dodane elementy, które obecnie są trudniejsze do przypisania do realizacji: koszty ludzi, produkcji, ekip, floty, narzędzi oraz kalkulacyjne prowizje.
-   **Prosty model zarządczy zamiast przebudowy księgowości.** Rozwiązanie nie wymaga zmiany planu kont, dekretacji ani sposobu pracy w Comarch ERP Optima. FlexiEPM będzie warstwą zarządczą nad istniejącymi danymi.
-   **Kontrola bieżącego „zapasu marży”.** Dla kontraktu system pokaże wartość umowną, koszty przypisane do tej pory oraz bieżący zapas marży, czyli prosty wskaźnik pokazujący, jaka część wartości kontraktu pozostaje po uwzględnieniu kosztów rozliczonych w modelu.
-   **Porównywalność kontraktów i linii biznesowych.** Kontrakty będzie można analizować pojedynczo oraz łącznie, np. według głównych linii działalności, typów realizacji, spółek lub innych uzgodnionych przekrojów.
-   **Model możliwy do utrzymania przez jedną osobę po stronie klienta.** Zakładamy, że za dane i raportowanie po stronie Box Haus odpowiadać będzie asystent CEO, dlatego rozwiązanie powinno być proste, powtarzalne i oparte na ograniczonej liczbie źródeł oraz formatek.

# Opis rozwiązania dla klienta

***

**Co będzie robił system**

-   **System będzie budował zarządczy rachunek ekonomiki kontraktów.** Główną jednostką analizy będzie kontrakt / realizacja. Dla każdego kontraktu system pokaże przychody, koszty przypisane bezpośrednio, koszty rozliczone zarządczo oraz bieżącą marżę.
-   **System będzie łączył dane z Optimy z danymi operacyjnymi i formatkami zarządczymi.** Dane z magazynów wirtualnych i zapisów źródłowych zostaną połączone z listą płac, ewidencją czasu pracy, listą pracowników, przypisaniem do ekip oraz prostymi parametrami zarządczymi.
-   **System będzie rozliczał koszty ludzi na kontrakty.** Koszty wynagrodzeń pracowników objętych modelem będą przypisywane do kontraktów na podstawie ewidencji czasu pracy. Czas nieprojektowy, absencje i inne aktywności ogólne będą ujmowane poza kontraktami.
-   **System będzie doliczał koszty produkcji i ekip według uzgodnionych reguł.** Koszt produkcji będzie liczony na podstawie stawki narzutu i danych o realizacji produkcji. Koszty ekip, samochodów, paliwa i narzędzi będą rozliczane uproszczonym narzutem, np. miesięcznie per ekipa, według struktury godzin projektowych.
-   **System będzie pokazywał wynik kontraktu i agregacje zarządcze.** Raportowanie obejmie karty kontraktów, zestawienie kontraktów oraz podsumowanie według głównych linii biznesowych. Szczegółowe rozliczenia będą dostępne jako drilldown / audit trail, a nie jako osobne rozbudowane moduły raportowe.

**Dane wejściowe**

-   **Zapisy źródłowe z Comarch ERP Optima.** W szczególności dane dotyczące przychodów, kosztów oraz przepływu kosztów na kontrakty / magazyny wirtualne. Model nie wymaga zmiany sposobu księgowania.
-   **Magazyny wirtualne.** Podstawowe źródło kosztów przypisanych dziś do konkretnej realizacji, w szczególności materiałów i usług kupowanych pod kontrakt.
-   **Lista płac.** Koszty wynagrodzeń per osoba, w zakresie potrzebnym do rozliczenia pracowników produkcyjnych i ekip na kontrakty.
-   **Ewidencja czasu pracy.** Dane pozwalające przypisać czas pracy osób do kontraktów lub aktywności nieprojektowych.
-   **Lista pracowników i przypisanie do ekip.** Informacja, które osoby są objęte rozliczeniem projektowym i do jakich ekip / brygad należą.
-   **Formatki zarządcze.** Proste formatki z parametrami modelu: stawki narzutów produkcyjnych, dane o realizacji produkcji, stawki prowizji, stawki kosztów ekip, wartość umowna kontraktu oraz przypisanie kontraktów do linii biznesowych.

**Model rozliczeniowy**

-   **Koszty z magazynów wirtualnych.** Koszty przypisane do kontraktu w Optimie trafiają do rachunku kontraktu jako koszty bezpośrednie realizacji.
-   **Przychody i wartość kontraktu.** System pokazuje przychody przypisane do kontraktu oraz wartość umowną jako punkt odniesienia dla oceny bieżącego zapasu marży.
-   **Koszty wynagrodzeń.** Wynagrodzenia pracowników objętych rozliczeniem projektowym są dzielone na kontrakty według ewidencji czasu pracy. Część nieprzypisana do kontraktów pozostaje w kosztach ogólnych / technicznych.
-   **Koszty produkcji.**Produkcja jest rozliczana zarządczo przez uzgodnioną stawkę dzienną lub godzinową oraz dane o tym, który projekt był produkowany i w jakim wymiarze.
-   **Koszty ekip, floty i narzędzi.** Dodatkowe koszty ekip mogą być ujmowane przez miesięczny narzut per ekipa i alokowane na kontrakty według udziału godzin projektowych pracowników danej ekipy.
-   **Prowizje handlowe.** Model może naliczać kalkulacyjny koszt prowizji według uzgodnionych stawek. Nie jest to księgowa rezerwa, tylko element zarządczego rachunku kontraktu.
-   **Pozycje poza kontraktami.** Koszty i przychody, które nie są przypisywane do kontraktów, pozostają poza rachunkiem kontraktowym jako pozycje ogólne, techniczne lub niealokowane.
-   **KWS i ryzyko podwójnego ujęcia.** Model kontraktowy nie powinien opierać się na księgowym KWS jako podstawowym źródle kosztu kontraktu. Sposób traktowania księgowań KWS wymaga weryfikacji, aby nie ująć tych samych kosztów dwukrotnie.

**Raporty**

-   **Karta kontraktu.** Wartość umowna, przychody, koszty z magazynów wirtualnych, koszty ludzi, produkcji, ekip, prowizje, bieżący zapas marży i marża zarządcza.
-   **Zestawienie kontraktów.** Porównanie kontraktów według wartości, kosztów, marży, statusu, linii biznesowej i innych podstawowych przekrojów.
-   **Podsumowanie linii biznesowych.** Agregacja kontraktów do głównych linii działalności, np. Box Haus / Erdol, standardowe / na zamówienie lub innych uzgodnionych kategorii.
-   **Drilldown / audit trail.** Możliwość zejścia do składowych kosztu: magazyn wirtualny, lista płac, czas pracy, produkcja, narzuty ekip, prowizje. To ma wspierać wyjaśnianie liczb, a nie tworzyć osobne rozbudowane raportowanie.

# Zakres podstawowy i opcje rozszerzenia

***

**Zakres podstawowy: ekonomika kontraktów**

-   **Zakres podstawowy obejmuje zarządczy model kontraktowy.** Rdzeniem jest karta kontraktu, zestawienie kontraktów i agregacja do linii biznesowych.
-   **Model bazuje na danych kontraktowych i prostych alokacjach.** Wykorzystuje magazyny wirtualne, listę płac, czas pracy, przypisanie pracowników do ekip oraz formatki z narzutami.
-   **Zakres podstawowy nie obejmuje klasycznego P&L.** Celem nie jest odtworzenie księgowego rachunku wyników, tylko pokazanie ekonomiki kontraktów w sposób użyteczny dla Zarządu.
-   **Zakres podstawowy powinien być możliwy do utrzymania przez jedną osobę.** Model nie powinien wymagać rozbudowanego zespołu controllingowego ani dużej liczby ręcznych korekt miesięcznych.

**Opcja 1: raport całej firmy z zapisów źródłowych z uzgodnieniem do ekonomiki kontraktów**

-   **Opcja 1 rozszerza model kontraktowy do perspektywy całej firmy.** Raport pokazuje ekonomię kontraktów, pozycje poza kontraktami oraz pozycję uzgodnienia / różnicy między rachunkiem kontraktowym a szerszą perspektywą firmy.
-   **Źródłem pozostają zapisy źródłowe i przepływy kosztów, a nie pełna obrotówka.** Ten wariant nadal jest modelem zarządczym, a nie klasycznym P&L księgowym.
-   **Celem jest kontrola kompletności modelu kontraktowego.** Raport pozwala zobaczyć, jaka część kosztów i przychodów jest ujęta w kontraktach, a jaka pozostaje poza kontraktami lub wymaga pozycji uzgodnieniowej.
-   **Zakres wymaga ostrożności przy KWS i logice magazynów wirtualnych.** Przed wdrożeniem konieczna jest analiza, jak zapisy źródłowe, magazyny wirtualne i księgowania KWS wpływają na ryzyko podwójnego ujęcia kosztów.

**  
**

**Opcja 2: niezależny P&L z obrotówki**

-   **Opcja 2 jest osobnym strumieniem raportowania.** Polega na imporcie obrotówki i mapowaniu kont do uproszczonego układu rachunku wyników.
-   **Nie jest warunkiem działania modelu kontraktowego.** Ekonomika kontraktów może działać niezależnie od P&L z obrotówki.
-   **Zakres tej opcji zależy od planu kont i jakości danych księgowych.** Przed wyceną i wdrożeniem wymaga weryfikacji struktury kont, sposobu księgowania oraz oczekiwanego układu raportu.

# Pozostałe założenia

***

**Dane historyczne**

-   **Minimalny zakres historyczny powinien obejmować 2026 rok.** Zakładamy zasilenie danych od początku 2026 roku, pod warunkiem dostępności spójnych danych źródłowych i braku istotnych zmian w strukturach ewidencyjnych.
-   **Dane za 2025 rok można ująć jako rozszerzenie.** Ma to sens szczególnie dla kontraktów rozpoczętych w 2025 roku i kontynuowanych w 2026 roku.
-   **Zakres historii zależy od jakości danych.** Jeżeli część danych nie była wcześniej zbierana w odpowiednim układzie, konieczne mogą być uproszczenia albo ograniczenie zakresu odtworzenia.

**Czego nie ruszamy**

-   **Nie zmieniamy planu kont, księgowości ani sposobu pracy w Optimie.** System korzysta z dostępnych danych i nie wymaga przebudowy procesu księgowego.
-   **Nie zmieniamy logiki dekretacji dokumentów.** Projekt nie zakłada zmiany sposobu księgowania kosztów, przychodów, magazynów ani KWS.
-   **Nie budujemy budżetowania ani forecastingu.** Rozwiązanie dotyczy danych Actual. Wartość kontraktu służy jako punkt odniesienia, nie jako prognoza wyniku końcowego.
-   **Nie wdrażamy planowania produkcji ani harmonogramowania ekip.** System wykorzystuje dane o realizacji produkcji i czasie pracy, ale nie zastępuje narzędzi operacyjnego planowania.
-   **Nie zmieniamy ewidencji czasu pracy, list płac ani sposobu opisywania dokumentów.** Model korzysta z danych, które organizacja już zbiera lub będzie dostarczać w prostych uzgodnionych formatach.
-   **Nie budujemy narzędzia do kosztorysowania ofertowego.** Projekt służy raportowaniu ekonomiki realizowanych kontraktów, a nie kalkulacji cen dla nowych umów.
-   **Nie tworzymy rozbudowanego systemu controllingu projektowego.** Celem jest prosty, powtarzalny model zarządczy, adekwatny do skali firmy i możliwy do obsługi przez jedną osobę po stronie klienta.
