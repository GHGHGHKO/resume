---
title: "Datadog 로그 수집 체계 구축"
description: "CUD 로그 기준 정의·전체 API Filter 표준화·개인정보 Marker 분리로 Datadog 기반 로그 체계를 구축하고 이슈 추적 시간을 단축했습니다."
publishDate: "2024-11-01"
tags: ["spring-boot", "datadog", "logging", "java"]
---

## 개요

운영 환경에서 이슈 발생 시 원인 추적에 시간이 걸리는 문제를 해결하고자, Datadog 기반 로그 수집 체계를 처음부터 구축했습니다.
CUD 로그 기준 정의, 전체 API 요청 로그 표준화, 개인정보 로그 분리까지 함께 진행했습니다.

- **회사**: GS리테일 / 물류DX팀
- **기간**: 2024.11 – 2024.12
- **역할**: 로그 설계·구현, 개인정보 필터링 처리
- **스택**: Spring Boot 3, Datadog, Logback Marker

---

## 배경

기존에는 각 API마다 로그 포맷이 제각각이었고, 운영 이슈가 발생했을 때 어느 요청에서 문제가 생겼는지 추적하기 어려웠습니다.
또한 데이터 변경 이력을 추적할 수 있는 체계가 없어, 운영 중 데이터 불일치가 발생해도 원인을 찾기 어려운 상황이었습니다.
개인정보가 포함된 로그가 외부 수집 시스템으로 전송되지 않도록 하는 요건도 함께 충족해야 했습니다.

---

## 주요 기여

### 1. CUD 로그 기준 정의 및 Datadog 전송

데이터 변경 이력 추적을 위해 Create·Update·Delete 로그 기준을 명시적으로 정의하고 Datadog으로 전송했습니다.

- 어떤 API가 어떤 데이터를 변경했는지 이력을 남겨 운영 중 데이터 불일치 원인 추적이 가능해졌습니다.
- 로그 레벨, 포맷, 필수 필드(requestId, userId, entity, action 등)를 표준화했습니다.

### 2. 전체 API Filter로 요청 로그 표준화

API마다 다른 로그 포맷 문제를 해결하고자, Spring의 `OncePerRequestFilter`를 전체 API에 적용해 요청 정보를 일관된 형식으로 수집했습니다.

```java
public class RequestLoggingFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, ...) {
        // 모든 요청에 대해 공통 필드 수집
        MDC.put("requestId", UUID.randomUUID().toString());
        MDC.put("uri", req.getRequestURI());
        MDC.put("method", req.getMethod());
        // ...
    }
}
```

- 모든 API 요청에 고유한 `requestId`가 부여되어, 분산 로그 추적이 가능해졌습니다.

### 3. 개인정보 로그 Marker 분리·필터링

개인정보가 포함된 로그는 Datadog으로 전송하지 않아야 하는 컴플라이언스 요건이 있었습니다.
Logback의 `Marker`를 활용해 개인정보 포함 로그를 분리하고, Datadog 전송에서 제외했습니다.

```java
// 개인정보 포함 로그 마킹
private static final Marker PERSONAL_INFO = MarkerFactory.getMarker("PERSONAL_INFO");

log.info(PERSONAL_INFO, "고객 정보 조회: {}", maskedPhoneNumber);
```

- Logback Appender 설정에서 `PERSONAL_INFO` 마커가 붙은 로그는 Datadog으로 전송하지 않음
- 내부 파일 로그에만 기록되어 감사 목적으로는 유지

---

## 결과

- 운영 이슈 발생 시 requestId로 요청 추적 시간 단축
- CUD 이력 로그로 데이터 불일치 원인 파악 가능
- 개인정보 로그 컴플라이언스 요건 충족

---

## 회고

로그 체계를 처음부터 설계할 때, "나중에 이슈가 생겼을 때 무엇이 필요한가"를 먼저 생각하는 것이 중요했습니다.
requestId 하나만 있어도 분산된 로그를 추적하는 속도가 크게 달라졌습니다.
개인정보 Marker 처리는 처음에는 복잡해 보였지만, Logback 설정 레벨에서 제어하니 비즈니스 로직에 영향을 주지 않으면서 요건을 충족할 수 있었습니다.
