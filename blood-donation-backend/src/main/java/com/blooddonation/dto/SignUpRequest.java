package com.blooddonation.dto;

import com.blooddonation.model.BloodGroup;
import com.blooddonation.model.Gender;
import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record SignUpRequest(
    @NotBlank @Size(max = 80) String firstName,
    @Size(max = 80) String middleName,
    @NotBlank @Size(max = 80) String lastName,
    @Size(max = 160) String fatherName,
    @Size(max = 160) String motherName,
    @NotBlank @Email @Size(max = 254) String email,
    @NotBlank @Pattern(regexp = "^[6-9][0-9]{9}$", message = "Enter a valid 10-digit Indian mobile number") String mobileNumber,
    @NotNull @Past(message = "Date of birth must be in the past") LocalDate dateOfBirth,
    @NotNull BloodGroup bloodGroup,
    @NotNull Gender gender,
    @Size(max = 2000) String medicalConditions,
    @NotBlank @Size(min = 8, max = 72, message = "Password must be 8-72 characters") String password,
    @AssertTrue(message = "You must accept the privacy/data consent to register") boolean consentAccepted
) {}
