package com.blooddonation.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "users", uniqueConstraints = {
    @UniqueConstraint(name = "uk_users_email", columnNames = "email"),
    @UniqueConstraint(name = "uk_users_mobile", columnNames = "mobile_number")
})
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "first_name", nullable = false, length = 80)
    private String firstName;

    @Column(name = "middle_name", length = 80)
    private String middleName;

    @Column(name = "last_name", nullable = false, length = 80)
    private String lastName;

    @Column(name = "father_name", length = 160)
    private String fatherName;

    @Column(name = "mother_name", length = 160)
    private String motherName;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Column(name = "mobile_number", nullable = false, unique = true, length = 10)
    private String mobileNumber;

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(name = "blood_group", nullable = false, length = 20)
    private BloodGroup bloodGroup;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Gender gender;

    @Column(name = "medical_conditions", length = 2000)
    private String medicalConditions;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "role", nullable = false, length = 20, columnDefinition = "varchar(20) default 'USER'")
    private String role = "USER";

    @Column(name = "consent_accepted", nullable = false)
    private boolean consentAccepted;

    @Column(name = "consent_accepted_at", nullable = false)
    private Instant consentAcceptedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (role == null || role.isBlank()) role = "USER";
        if (consentAcceptedAt == null && consentAccepted) consentAcceptedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public Long getId() { return id; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String v) { firstName = v; }
    public String getMiddleName() { return middleName; }
    public void setMiddleName(String v) { middleName = v; }
    public String getLastName() { return lastName; }
    public void setLastName(String v) { lastName = v; }
    public String getFatherName() { return fatherName; }
    public void setFatherName(String v) { fatherName = v; }
    public String getMotherName() { return motherName; }
    public void setMotherName(String v) { motherName = v; }
    public String getEmail() { return email; }
    public void setEmail(String v) { email = v; }
    public String getMobileNumber() { return mobileNumber; }
    public void setMobileNumber(String v) { mobileNumber = v; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate v) { dateOfBirth = v; }
    public BloodGroup getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(BloodGroup v) { bloodGroup = v; }
    public Gender getGender() { return gender; }
    public void setGender(Gender v) { gender = v; }
    public String getMedicalConditions() { return medicalConditions; }
    public void setMedicalConditions(String v) { medicalConditions = v; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String v) { passwordHash = v; }
    public String getRole() { return role != null ? role : "USER"; }
    public void setRole(String v) { this.role = (v != null && !v.isBlank()) ? v : "USER"; }
    public boolean isConsentAccepted() { return consentAccepted; }
    public void setConsentAccepted(boolean v) { consentAccepted = v; }
    public Instant getConsentAcceptedAt() { return consentAcceptedAt; }
    public void setConsentAcceptedAt(Instant v) { consentAcceptedAt = v; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
