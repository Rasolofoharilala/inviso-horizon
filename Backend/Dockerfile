# syntax=docker/dockerfile:1
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw
COPY src/ src/
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -DskipTests package && \
    cp target/*.jar /app/app.jar

FROM eclipse-temurin:25-jre AS runtime
WORKDIR /app
COPY --from=build /app/app.jar app.jar
RUN mkdir -p /app/images && chown 10001:10001 /app/images
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
