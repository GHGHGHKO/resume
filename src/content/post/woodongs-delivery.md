---
title: '택배 서비스 Backend Monorepo 설계·구축'
description: '우리동네GS 연동을 시작으로 택배 backend monorepo를 설계했습니다. 봉투 암호화 JWT로 6개 시스템·18,000대 장비 인증을 통합하고 Spring Security로 API 격리를 구현했습니다.'
publishDate: '2023-11-01'
tags: ['java', 'spring-boot', 'spring-security', 'jwt', 'kms', 'kubernetes', 'datadog']
---

## 개요

우리동네GS 앱 택배 서비스 연동을 계기로, **택배 서비스 전체의 backend monorepo**를 신규 설계·구축했습니다.
처음에는 우리동네GS 앱 하나만 연동했지만, 이 저장소는 이후 아래 시스템 전체가 사용하는 택배 서비스의 핵심 백엔드가 됐습니다.

| 시스템                 | 용도                    |
| ---------------------- | ----------------------- |
| 우리동네GS 앱          | 소비자 택배 접수·조회   |
| 물류센터               | 물류 현장 운영          |
| 택배홈페이지           | 웹 기반 택배 서비스     |
| GSRETAIL (CRM)         | 고객 관리 플랫폼        |
| BACKOFFICE             | 내부 운영·관리          |
| 전국 택배장비 18,000대 | PDA·단말기 등 현장 장비 |

- **회사**: GS리테일 / 물류DX팀
- **기간**: 2023.11 – 2024.12
- **역할**: 백엔드 monorepo 설계·개발, 인증/인가 아키텍처 설계, Spring Security 구현
- **스택**: Java, Spring Boot 3, Spring Security, JWT(JWE), AWS KMS, Kubernetes, Aurora PostgreSQL, Datadog

---

## 배경

택배 서비스를 처음 연동할 당시, 향후 다양한 시스템이 동일한 비즈니스 로직을 공유할 것임이 명확했습니다.
각 시스템이 별도 저장소를 가지면 인증 정책·비즈니스 규칙이 분산되어 일관성 유지가 어렵습니다.
이를 방지하고자 **인증 / 인가 / 비즈니스** 레이어를 하나의 monorepo에 통합하는 구조를 처음부터 설계했습니다.

다양한 시스템(앱·웹·현장 장비)이 동일 API를 사용하는 구조에서는 두 가지 보안 요건을 구조적으로 충족해야 했습니다.

1. **시스템 격리**: 물류센터가 소비자 전용 API를 호출하거나, 앱이 내부 운영 API를 호출할 수 없어야 함
2. **고객 데이터 격리**: 고객 A가 고객 B의 개인정보(주소, 주문 이력 등)를 조회할 수 없어야 함

---

## 아키텍처

### Monorepo 레이어 구조

```
택배 Backend Monorepo
├── auth/           # 인증 (토큰 발급·검증, KMS 연동)
├── authorization/  # 인가 (시스템별 권한, 고객 데이터 격리)
└── business/       # 비즈니스 (접수, 조회, 상태관리, 주소록, 쿠폰 등)
```

모든 시스템은 이 하나의 저장소를 통해 택배 서비스에 접근합니다.
비즈니스 로직 변경은 한 곳에서만 이루어지므로 일관성이 보장됩니다.

---

## 주요 기여

### 1. 봉투 암호화(Envelope Encryption) 기반 JWT — Stateless 유지

단순 RSA 서명이 아닌 **봉투 암호화(Envelope Encryption)** 방식을 적용해,
페이로드를 암호화하면서도 서버에 상태를 저장하지 않는 Stateless 구조를 유지했습니다.

```
[로그인 요청]
    │
    ▼
[인증 서버]
    ├── 1. AWS KMS에 데이터 암호화 키(DEK) 생성 요청
    ├── 2. DEK로 JWT 페이로드 암호화 (AES-GCM)
    ├── 3. KMS CMK로 DEK를 암호화 → Encrypted DEK
    └── 4. JWE 발급: { header . encryptedDEK . iv . ciphertext . tag }

[클라이언트 → API 요청]
    │  Authorization: Bearer <JWE>
    ▼
[서비스 서버]
    ├── 1. JWE에서 Encrypted DEK 추출
    ├── 2. KMS API로 DEK 복호화
    ├── 3. DEK로 페이로드 복호화 → claims 획득
    └── 4. Spring Security 인가 처리
```

**이 방식을 선택한 이유:**

| 항목          | 일반 JWT(JWS)              | 봉투 암호화 JWT(JWE) |
| ------------- | -------------------------- | -------------------- |
| 페이로드 노출 | Base64 디코딩 시 평문 노출 | 암호화로 내용 보호   |
| 키 관리       | 서명 키를 서버가 직접 보유 | KMS 외부로 키 미노출 |
| Stateless     | ✅                         | ✅                   |
| 확장성        | 서버 증가 시 키 공유 필요  | KMS 호출만으로 처리  |

- **Stateless 유지**: 세션 저장소 없이 토큰만으로 인증 완결 → 18,000대 장비가 늘어도 인증 서버 부하 없이 수평 확장 가능
- **페이로드 기밀성**: 토큰 탈취 시에도 고객 정보 노출 없음
- **키 보안**: 개인 키가 KMS 외부로 절대 노출되지 않음

### 2. 6개 시스템 간 API 격리 — Spring Security Best Practice

JWT claims의 `system` 필드를 기반으로, 각 시스템이 **자신에게 허가된 API만 호출**할 수 있도록 Spring Security로 선언적으로 제어했습니다.

```java
// JWT claims 구조
{
  "sub":    "user_123",
  "system": "WOODONGS",
  "roles":  ["ROLE_CUSTOMER"],
  "scope":  ["delivery:read", "delivery:write", "address:manage"]
}
```

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.authorizeHttpRequests(auth -> auth
        // 소비자 전용 — 앱·홈페이지만 허용
        .requestMatchers("/api/customer/**")
            .hasAnyAuthority("SYSTEM_WOODONGS", "SYSTEM_HOMEPAGE")

        // 물류센터 전용
        .requestMatchers("/api/logistics/**")
            .hasAuthority("SYSTEM_LOGISTICS")

        // 현장 장비 전용 — 18,000대 PDA만 허용
        .requestMatchers("/api/device/**")
            .hasAuthority("SYSTEM_DEVICE")

        // 백오피스 전용
        .requestMatchers("/api/backoffice/**")
            .hasAuthority("SYSTEM_BACKOFFICE")
    );
    return http.build();
}
```

물류센터 시스템이 소비자 API를 호출하거나, 현장 장비가 백오피스 API를 호출하는 시도는
비즈니스 코드에 도달하기 전에 Spring Security 레벨에서 차단됩니다.

### 3. 고객 데이터 격리 — Filter 기반 Object-Level Authorization

시스템 격리와 별개로, **같은 시스템 내 고객 A가 고객 B의 데이터를 조회하지 못하도록**
객체 수준 인가를 Controller가 아닌 **Security Filter** 단계에서 처리했습니다.

Controller에 `@PreAuthorize`를 붙이는 방식은 어노테이션 누락 시 보안 홀이 생기는 반면,
Filter에서 처리하면 **모든 요청이 비즈니스 코드에 도달하기 전에 반드시 통과**해야 하므로 누락 위험이 없습니다.

```java
// Security Filter — 소유자 검증 (Controller 도달 전 처리)
public class CustomerResourceAuthorizationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws IOException, ServletException {

        String customerId = extractCustomerIdFromJwt(request); // JWT sub 클레임
        String resourceOwnerId = resolveOwnerIdFromPath(request); // 경로에서 리소스 소유자 추출

        if (resourceOwnerId != null && !customerId.equals(resourceOwnerId)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN);
            return;
        }

        chain.doFilter(request, response);
    }
}

// SecurityFilterChain에 등록
http.addFilterBefore(
    customerResourceAuthorizationFilter,
    AuthorizationFilter.class
);
```

- Controller·Service 코드에 인가 로직이 전혀 섞이지 않아 비즈니스 코드가 단순해짐
- 새 API가 추가되어도 Filter가 일괄 적용되므로 보안 정책 누락 불가
- JWT의 `sub` 클레임(customerId)과 요청 경로의 리소스 소유자를 Filter 단계에서 대조해 타 고객 접근을 구조적으로 차단

### 4. 18,000대 현장 장비 인증

전국에 분산된 18,000대 장비는 사람 계정이 아닌 **장비 자체가 인증 주체**입니다.

- 장비별 고유 식별자(device ID)로 JWE 발급, `system: SYSTEM_DEVICE` 클레임 포함
- Stateless 구조 덕분에 장비 수가 늘어도 인증 서버 부하 없이 확장 가능
- 장비 토큰의 scope가 소비자·운영 API와 완전히 분리되어, 장비가 고객 데이터에 접근하는 것은 구조적으로 불가

### 5. 웹뷰 인증 연속성 · 주소록 · 쿠폰

- **웹뷰**: 앱 → 웹뷰 전환 시 JWE 토큰이 끊기지 않도록 컨텍스트 이어받기 처리
- **주소록**: 배송지 등록·수정·삭제·기본 설정
- **쿠폰**: 등록·조회·사용·선물 전체 플로우

### 6. 오프쇼어 팀 연동 조율

우리동네GS 앱 개발을 담당하는 오프쇼어 팀과의 API 연동 과정에서,
스펙 차이·타임존·인코딩 이슈를 직접 조율하고 재현 케이스를 문서화해 합의를 이끌어냈습니다.

### 7. PR 기반 코드 리뷰 문화 도입 제안

별도의 코드 리뷰 프로세스가 없던 팀에서 Pull Request를 통한 코드 리뷰 방식 도입을 제안했습니다.

- 팀 전체 정착에는 이르지 못했지만, 제안 과정에서 리뷰 문화의 필요성을 구체적으로 정리하고 공유하는 경험을 했습니다.
- PR을 통해 서로 피드백을 주고받으며 코드 리뷰가 결함 발견보다 서로 배우는 과정임을 체감했습니다.

### 8. 택배팀 테크 세미나 기획·운영

택배팀 내 자체 테크 세미나를 기획하고 주도했습니다.

- 팀원들이 각자 관심 주제를 선정해 회의실에서 발표하고 함께 학습하는 방식으로 진행
- 직접 **Git**, **Docker**를 주제로 발표
- 평소 Java 중심 환경에서 벗어나 **Rust** 언어 소개 세미나([Rust 찍어먹기](https://pepega.tistory.com/85))도 진행 — 소유권 모델·메모리 안전성 등 Java와 다른 설계 철학을 공유

---

## 운영 지표

**Datadog APM 기준 (2025년 2월~3월 1주일 평균)**

| 서비스                             | 일 처리량                    | 레이턴시                    | 에러율    |
| ---------------------------------- | ---------------------------- | --------------------------- | --------- |
| api-gspostbox (방문택배)           | 일 최대 120만 건 (~65 req/s) | P95 30ms 이하               | 0.1% 미만 |
| blackpink (우리동네GS·물류센터 등) | 일 최대 15만 건              | P50 30~50ms, P90 200ms 이하 | —         |
| **택배 플랫폼 합산**               | **약 135만 건/day**          | —                           | —         |
| Redis                              | ~1,000 req/s                 | P99 13.8μs                  | —         |
| PostgreSQL                         | ~204 req/s                   | P99 10.2ms                  | —         |

---

## 결과

- **단일 monorepo**가 6개 시스템 + 전국 18,000대 장비의 공통 백엔드로 자리잡음
- **전체 택배 플랫폼 약 135만 건/day** 처리 (방문택배 120만 + 우리동네GS·물류센터 등 15만)
- **봉투 암호화 JWE**로 Stateless 유지 + 페이로드 기밀성 동시 확보
- **시스템 간 API 완전 격리**: 월권 접근 시도가 비즈니스 코드에 도달하기 전에 차단
- **고객 데이터 격리**: 타 고객 개인정보 조회를 구조적으로 차단
- 오픈 이후 인증·인가 관련 장애 없이 안정적 운영

---

## 회고

이 프로젝트에서 가장 중요하게 생각한 것은 **"처음부터 여러 시스템이 함께 쓸 수 있는 구조"** 를 만드는 것이었습니다.

monorepo에 인증·인가를 통합한 덕분에, 이후 물류센터·GSRETAIL·현장 장비 연동이 추가될 때 인증 정책을 반복 구현하지 않아도 됐습니다.
봉투 암호화를 선택한 것은 보안 요건 때문이었지만, Stateless 유지라는 운영 편의성도 함께 얻었습니다.
Spring Security의 선언적 접근 제어는 비즈니스 코드에 인가 로직이 섞이지 않도록 분리해주어,
시스템이 여러 개로 늘어나도 정책 일관성을 유지하기 쉬웠습니다.
