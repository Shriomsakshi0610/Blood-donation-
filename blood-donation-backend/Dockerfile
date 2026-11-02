# -------------------------------------------------------------
# Stage 1: Build the Spring Boot Application
# Uses Maven 3.9.9 with Eclipse Temurin JDK 17
# -------------------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-17 AS builder
WORKDIR /app

# Cache Maven dependencies by copying pom.xml and wrapper configuration first
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .

# Download dependencies offline to take advantage of Docker layer caching
RUN mvn dependency:go-offline -B || true

# Copy project source code and static resources
COPY src ./src

# Build the production executable JAR (skipping unit tests during container build)
RUN mvn clean package -DskipTests -B

# -------------------------------------------------------------
# Stage 2: Production Runtime
# Uses lightweight Eclipse Temurin JRE 17
# -------------------------------------------------------------
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create a dedicated non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy the built executable JAR from builder stage with correct ownership
COPY --from=builder --chown=spring:spring /app/target/*.jar app.jar

# Render assigns a dynamic port via the PORT environment variable
EXPOSE 8080

# Launch application and explicitly bind to Render's $PORT (fallback to 8080)
ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar app.jar"]
