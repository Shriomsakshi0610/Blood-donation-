package com.blooddonation.repository;

import com.blooddonation.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByMobileNumber(String mobileNumber);

    boolean existsByRole(String role);
    Optional<User> findFirstByRole(String role);
    long countByRole(String role);

    @Query("SELECT COUNT(DISTINCT u.bloodGroup) FROM User u WHERE u.bloodGroup IS NOT NULL")
    long countDistinctBloodGroups();
}
