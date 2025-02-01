# Liquibase and postgres

## Driver properties

To enable SSL, one must provide postgres driver properties related to SSL as follows. All paths must be absolute.

``` properties
# Credentials
user=user
password=password

# SSL
ssl=true
sslmode=verify-full

# CA cert
sslrootcert=/Users/antmoute/Documents/dev/parking/parking-backend/liquibase/config/ca.crt

# client cert
sslcert=/Users/antmoute/Documents/dev/parking/parking-backend/liquibase/config/liquibase.crt

# client key. Must be in PKCS-12 format
sslkey=/Users/antmoute/Documents/dev/parking/parking-backend/liquibase/config/liquibase.p12

# Key password
sslpassword=my-key-password
```

## Troubleshooting

If no password is specified while the client key has one, the liquibase client will block and not throw any error.