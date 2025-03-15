# parking-backend

Backend-side of a parking application.

The app's aim is to enable the user to save where its car was parked and most importantly if the user must move the car before a given time.
These operations can be performed thanks to the restful APIs exposed.

## Stack
Application is written in **Javascript** to learn **Nodejs** along with the **Express** framework.
All data are stored in a Postgres database.

All database structural operations, such as adding columns for instance, are realized by using **Liquibase**.

## Quickstart

### Start the application

``` bash
npm install
npm run start
```

### Execute liquibase updates

``` bash
npm run liquibase:status # check if there are database updates to run
npm run liquibase:update # execute the updates
```
