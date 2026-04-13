# Marker & Review System — UXP Plugin za Premiere Pro

## Documentation
Familiarize yourself with the following concepts to understand the plugins in more detail
- [Plugin entry-points](https://developer.adobe.com/premiere-pro/uxp/plugins/concepts/entrypoints/)
- [Plugin manifest](https://developer.adobe.com/premiere-pro/uxp/plugins/concepts/manifest/)

## Getting started

Load plugin into the application via UXP Developer Tools (UDT)
1. Make sure your application is running and you can see it under 'Connected apps'
2. Click on 'Add Plugin' button and select the `manifest.json` of this plugin.
3. Click "Load" in the corresponding workspace entry. 

## O projektu
UXP plugin za Adobe Premiere Pro — sistem za pregled in
komentiranje videa. Dodajanje časovno označenih komentarjev
na timeline, kategorizacija, sledenje statusu
in statistika pripravljenosti projekta.

## Tehnologije
- UXP (Unified Extensibility Platform)
- HTML + CSS + vanilla JavaScript
- Adobe Spectrum Web Components
- Premiere Pro UXP API

## Pomembno
- Premiere Pro API: require('premierepro')
- Markerji: activeSequence.markers za branje/pisanje
- UI: Adobe Spectrum komponente (sp-button, sp-checkbox,
  sp-dropdown, sp-progressbar ...)
- Shranjevanje: UXP storage API za statuse in prioritete
- Statusi se shranjujejo lokalno ker
  Premiere Pro marker API ne podpira custom polj

## Struktura
- index.html — glavni UI panel
- index.js — vstopna logika in event handling
- js/categories.js — kategorije
- js/marker-manager.js — delo z markerji
- js/review-list.js — prikaz seznama
- js/filters.js — filtriranje
- js/storage.js — lokalna shramba statusov