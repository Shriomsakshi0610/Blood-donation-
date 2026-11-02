package com.blooddonation.dto;

import com.blooddonation.model.BloodGroup;
import com.blooddonation.model.Gender;
import com.blooddonation.model.User;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;

public record UserProfileResponse(
    Long id, String firstName, String middleName, String lastName,
    String fatherName, String motherName, String email, String mobileNumber,
    LocalDate dateOfBirth, int age, BloodGroup bloodGroup, Gender gender,
    String medicalConditions, boolean consentAccepted, Instant createdAt
) {
    public static UserProfileResponse from(User user) {
        int age = Period.between(user.getDateOfBirth(), LocalDate.now()).getYears();
        return new UserProfileResponse(
            user.getId(), user.getFirstName(), user.getMiddleName(), user.getLastName(),
            user.getFatherName(), user.getMotherName(), user.getEmail(), user.getMobileNumber(),
            user.getDateOfBirth(), age, user.getBloodGroup(), user.getGender(),
            user.getMedicalConditions(), user.isConsentAccepted(), user.getCreatedAt()
        );
    }
}
