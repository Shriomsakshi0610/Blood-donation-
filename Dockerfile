# -------------------------------------------------------------
# Stage 1: Build the Spring Boot Application
# -------------------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-17 AS builder
WORKDIR /app/blood-donation-backend

# Cache dependencies
COPY blood-donation-backend/pom.xml .
COPY blood-donation-backend/.mvn .mvn
COPY blood-donation-backend/mvnw .

RUN mvn dependency:go-offline -B || true

# Copy source code and build
COPY blood-donation-backend/src ./src
RUN mvn clean package -DskipTests -B

# -------------------------------------------------------------
# Stage 2: Production Runtime
# -------------------------------------------------------------
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

COPY --from=builder --chown=spring:spring /app/blood-donation-backend/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar app.jar"]
