# Aplikacja - SavingsAgent (MVP)


## Główny problem

Użytkownicy muszą przeglądać wiele źródeł (strony sklepów, serwisy z gazetkami) aby znaleźć aktualne promocje w dyskontach. Brak centralnej, przeszukiwalnej i ustrukturyzowanej bazy promocji utrudnia szybkie porównania i odnalezienie najlepszych ofert.


## Najmniejszy zestaw funkcjonalności

- Możliwość ręcznego wgrania obrazu gazetki (JPG/PNG) i zapis pliku w storage.  
- Pipeline przetwarzania: preprocessing obrazu (deskew/kontrast) → OCR → ekstrakcja strukturalna produktów przez LLM.  
- Zapis wyników do bazy: `stores`, `flyers`, `pages`, `products` (nazwa, cena, jednostka, promocja, warunki, źródło, confidence).  
- Prosty frontend (Astro + React): lista produktów, filtrowanie po sklepie i kategorii, sortowanie po cenie.  
- Prosty interfejs korekty: możliwość poprawy / potwierdzenia wyciągniętych danych przez użytkownika.


## Co NIE wchodzi w zakres MVP

- Automatyczny crawling wszystkich stron i pełne zautomatyzowane pobieranie gazetek (MVP: ręczny upload).  
- Zaawansowane funkcje porównywania cen między sklepami i powiadomienia push/email.  
- Pełna automatyczna normalizacja nazw produktów (słownik pełen marek) i zaawansowana deduplikacja.  
- Wiele sklepów — start tylko z dwoma: Lidl i Biedronka.  
- Rozbudowane funkcje skalowania i koszt-optimizations dla dużego ruchu (optymalizacje po MVP).


## Kryteria sukcesu

- Możliwość wgrania obrazka gazetki i wyodrębnienia co najmniej 10–30 produktów ze strony z poprawnością manualnie walidowaną ≥ 80% (po korektach).  
- Działa pipeline: upload → OCR → LLM → zapis do Supabase i prezentacja na stronie z filtrowaniem po sklepie i kategorii.  
- Użytkownik potrafi wyszukać i przefiltrować oferty z dwóch sklepów (Lidl, Biedronka).  
- MVP wdrożone (frontend na Vercel, Supabase działające) i testowane dla ~1000 użytkowników z prostym limitem użycia (kontrola kosztów).  
- Całkowity nakład pracy: realistyczny do zrobienia w ~6 tygodni przy ~10 h/tydz. (ok. 60 godzin) z użyciem komercyjnego OCR i LLM.

