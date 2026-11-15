# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## Connect to the Agendamento API

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to an address reachable from the device running the app:

- Android emulator: `http://10.0.2.2:8093`
- Physical phone: `http://<LAN-IP-of-the-computer-running-the-API>:8093` (the Expo Web origin must also be allowed by backend CORS)
- Web on the same computer: `http://localhost:8093` (the backend must also allow the web origin through CORS)

The registration screen also calls the Cliente API on port `8091` and the Lojista API on port `8090`. Their URLs are derived from `EXPO_PUBLIC_API_URL` by default; override them with `EXPO_PUBLIC_CLIENTE_API_URL` and `EXPO_PUBLIC_LOJISTA_API_URL` when the APIs use different hosts or ports. Restart Expo after changing `.env`.

Registration creates the same email/password account in Agendamento and in the selected profile service, then logs in to that service and creates the Cliente or Lojista profile. Cliente registration requires a complete address; Lojista address is optional. If a request fails partway through, the screen reports the failing step; retrying with the same email and password reuses an account only after verifying those credentials.

The app can sign in with a profile email; accounts with both Cliente and Lojista profiles can choose which experience to open. Existing Cliente accounts can still use their UUID as login. The Lojista area includes an appointment agenda and management screens for establishments, offered services, and availability grids. Establishments and services use the Lojista API; grades use the Agendamento API. Account and profile data remain in separate APIs and are not transactionally linked.

Restart Expo after changing `.env`. Sign in with an existing API account whose login is the customer UUID; the app stores the JWT with SecureStore on iOS/Android and sends it as a Bearer token. Account creation is not exposed in the app because the current public registration endpoint accepts a client-supplied role.

The current backend has no customer-scoped appointment-list route. For the agreed single-customer test setup, the app filters the existing global appointment response by the login UUID. Do not use this global-list behavior with multiple customers or real customer data.
The agenda's date selector is populated from the distinct appointment dates returned by the API, rather than a locally generated weekday range.

The API also does not provide service names, prices, durations, or a customer profile. The booking screen therefore lists active schedule grades by UUID and shows service/establishment UUID prefixes. The API's availability endpoint returns dates as `dd/MM/yyyy`; the app maps them to its `YYYY-MM-DD` model and sends the selected `gradeHorario` UUID when creating the booking.

Native mobile requests are not subject to browser CORS. Expo Web in a phone browser requires the phone's LAN origin (for example, `http://192.168.15.23:8081`) to be allowed by backend CORS. The backend uses a local H2 file by default; tests use an isolated in-memory database.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
