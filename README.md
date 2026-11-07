# WeatherWise (mobile)

Expo (React Native) app for the IT5007 project. Right now it has one tab, **Today**:

1. Gets your location (falls back to City Hall if location is off or the device is outside Singapore).
2. Reads live 24-hour PSI and the 2-hour rain forecast from NEA via data.gov.sg.
3. The rule engine (`src/lib/rules.js`) decides indoor / outdoor:
   - PSI above 100 → indoor (haze)
   - rain, showers or thunder in the forecast → indoor
   - PSI 51–100 and dry → either, outdoor first
   - otherwise → outdoor
4. Shows the 3 closest places that fit, each with a one-line reason.

## Run it on the Android emulator (Android Studio)

```bash
npm install
```

1. Android Studio → **Device Manager** → start an emulator (any recent Pixel).
2. In this folder run `npx expo start`, then press **a**. Expo Go installs on the emulator and opens the app.
3. The emulator thinks it is in California, so the app falls back to City Hall. To test a real area, open the emulator's **⋯ → Location**, search for e.g. "Tampines", click **Set location**, then pull down on the Today screen to refresh.

## Run it on a phone

Install **Expo Go** from the Play Store / App Store, run `npx expo start`, and scan the QR code (phone and laptop on the same Wi‑Fi). On NUS Wi‑Fi use `npx expo start --tunnel` instead.

## Run it in a browser

`npx expo start --web` (handy for quick UI checks).

## Tests

`npm test` runs the rule-engine tests against sample data.gov.sg responses.

## Where things are

| File | What it does |
| --- | --- |
| `src/app/(tabs)/_layout.js` | Tab bar. Add a tab: create `src/app/(tabs)/space.js` and add a `<Tabs.Screen name="space" />`. |
| `src/app/(tabs)/index.js` | The Today screen. |
| `src/lib/api.js` | data.gov.sg calls. When the Express backend is ready, swap `fetchToday()` to call it and keep the same return shape. |
| `src/lib/rules.js` | Indoor/outdoor decision and ranking. Pure JS, so it can move into the backend as is. |
| `src/data/places.js` | Starter list of 20 places. Replace with NParks/STB data from the backend. |
| `src/theme.js` | Colours and fonts, matching the web mockups. |

## Notes

- data.gov.sg works without a key for light use. If you hit rate limits, get a key and put it in `.env` as `EXPO_PUBLIC_DATAGOV_API_KEY=...`.
- The app name "WeatherWise" is a placeholder; change `name` in `app.json`.
