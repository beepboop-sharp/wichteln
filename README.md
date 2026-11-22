# 🎄 Wichteln

Statische Wichtel-Seite für GitHub Pages – kein Server, keine Datenbank.

👉 **Live: https://beepboop-sharp.github.io/wichteln/**

## Benutzung
1. [Seite öffnen](https://beepboop-sharp.github.io/wichteln/), Namen eintragen, optional Ausschlüsse (z.B. Paare) festlegen.
2. **Auslosen** klicken.
3. Jedem seinen persönlichen Link schicken (Kopieren / Teilen).
4. Wer den Link öffnet, sieht nur die eigene Ziehung – mit Geschenk-Animation.

Die Ziehung steckt verschleiert im Link (hinter dem `#`) und wird nirgends gespeichert.
Achtung: Wird neu ausgelost, funktionieren alte Links weiterhin, zeigen aber die alte Ziehung – also nur einmal auslosen und dann verschicken.

## Deployment
Repo pushen → GitHub → **Settings → Pages** → *Deploy from a branch* → `main` / `/ (root)`.
Jeder Push auf `main` wird automatisch nach https://beepboop-sharp.github.io/wichteln/ deployt.

## Sicherheit & Datenschutz
- **Kein Server, keine Datenbank.** Nichts wird gespeichert oder übertragen. Namen/Ausschlüsse liegen nur im Browser des Organisators (localStorage), das Ziehungsergebnis nirgends.
- **Jeder Link enthält nur die eigene Paarung** (Geber → Empfänger) – andere Paarungen sind daraus nicht ableitbar.
- Der Teil hinter `#` wird vom Browser **nie an einen Server gesendet** (auch nicht an GitHub).
- Die Kodierung ist **Verschleierung, keine Verschlüsselung**: Wer einen Link hat, kann dessen Inhalt sehen. Also: Links einzeln verschicken, nicht in Gruppen posten.
- Der Organisator hat alle Links und könnte sie theoretisch öffnen – ohne Server nicht vermeidbar.
- Schriften sind selbst gehostet, keine Drittanbieter-Requests; strikte Content-Security-Policy, `no-referrer`, `noindex`.
