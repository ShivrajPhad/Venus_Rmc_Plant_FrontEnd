# VenusRmcPortal

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.0.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Authentication and master data

The application opens on the login page. It sends the username and password to
`https://localhost:44391/api/Authantication/login`, stores the returned JWT in
browser local storage, and sends it as a Bearer token on master-data requests.
After signing in, the master layout provides Dashboard and Batch Report
navigation. Dashboard displays:

- Truck Details: `/api/Master/GetTruckDetails`
- Driver Details: `/api/Master/GetDriverDetails`
- Recipe Details: `/api/Master/GetRecipeDetails`
- Customer Details: `/api/Master/GetCustomerDetails`
- Site Details: `/api/Master/GetSiteDetailsDetails`

Customer Details creates and updates customers through the
`/api/Master/SaveCustomer` POST endpoint. The request includes the customer ID
for updates, active status, and the signed-in user's ID from the JWT. The
customer table is searchable and paginated in the browser.

Site Details creates and updates sites through the `/api/Master/SaveSite` POST
endpoint. Select a customer before entering the site name and address.

Truck Details creates and updates trucks through the
`/api/Master/SaveTruckDetails` POST endpoint. The truck table is paginated in
the browser.

Driver Details creates and updates drivers through the
`/api/Master/SaveDriverDetails` POST endpoint. Driver name and mobile number
are required, and the driver table is paginated in the browser.

Recipe Details creates and updates recipes through the
`/api/Master/SaveRecipeDetails` POST endpoint. Select a customer and enter
recipe details and mix quantities; the recipe table is paginated in the
browser.

Batch Report loads customer, site, recipe, driver, and truck options from the
master data API. Select the report details and generate a docket-style preview;
the Save report action downloads the generated report as a CSV file.

The API must be running and its HTTPS development certificate must be trusted by
the browser. The API must also allow cross-origin requests from the frontend
origin.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
