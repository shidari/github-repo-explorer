FROM postgres:17-alpine
COPY migration.sql /docker-entrypoint-initdb.d/
ENV POSTGRES_USER=codegen
ENV POSTGRES_PASSWORD=codegen
ENV POSTGRES_DB=codegen
