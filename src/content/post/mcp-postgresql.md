---
title: 'Claude + PostgreSQL MCP 연동 가이드'
description: 'Claude Desktop / Claude Code에서 PostgreSQL MCP를 연결해 자연어로 DB를 조회하고 분석하는 방법을 정리했습니다.'
publishDate: '2026-03-06'
tags: ['claude', 'mcp', 'postgresql', 'database', 'ai']
---

Claude Desktop / Claude Code에서 PostgreSQL MCP를 연결하면 자연어로 DB를 조회하고 분석할 수 있습니다.

---

## 사전 준비

- Claude Desktop 또는 Claude Code CLI 설치
- PostgreSQL 접근 가능한 DB 호스트/계정 정보
- Node.js 설치 (`npx` 사용)

---

## 설정 방법

### Claude Code 전역 설정 (`~/.claude.json`)

`~/.claude.json` 파일의 `mcpServers` 섹션에 아래 내용을 추가합니다.

```json
{
	"mcpServers": {
		"postgres": {
			"command": "npx",
			"args": [
				"-y",
				"@modelcontextprotocol/server-postgres",
				"postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE"
			]
		}
	}
}
```

| 항목       | 설명                       |
| ---------- | -------------------------- |
| `USERNAME` | DB 계정명                  |
| `PASSWORD` | DB 비밀번호                |
| `HOST`     | DB 호스트 (IP 또는 도메인) |
| `PORT`     | 포트 (기본값: `5432`)      |
| `DATABASE` | 접속할 DB 이름             |

> **보안 주의**: `~/.claude.json`의 파일 권한을 `600`으로 설정하세요.
>
> ```bash
> chmod 600 ~/.claude.json
> ```

### Claude Desktop 설정

`~/Library/Application Support/Claude/claude_desktop_config.json` 파일에 동일한 내용을 추가합니다.

---

## 연결 확인

Claude 재시작 후 자연어로 요청합니다.

```
users 테이블 구조 보여줘
최근 7일간 가입한 사용자 수 조회해줘
```

---

## 활용 예시

| 요청                  | 설명                |
| --------------------- | ------------------- |
| 테이블 목록 조회      | DB 구조 파악        |
| 특정 조건 데이터 조회 | 데이터 분석         |
| 집계 쿼리 요청        | 통계/현황 파악      |
| ERD 관계 설명 요청    | 테이블 간 관계 이해 |

SQL을 직접 작성하지 않아도 자연어로 요청하면 Claude가 쿼리를 생성하고 결과를 반환합니다.

---

## 주의사항

- **읽기 전용 계정 사용 권장**: 운영 DB 연결 시 `SELECT` 권한만 부여된 계정을 사용하세요.
- Claude는 요청에 따라 `INSERT`, `UPDATE`, `DELETE`도 실행할 수 있으므로, 운영 환경에서는 반드시 읽기 전용 계정으로 연결합니다.
- 민감한 데이터(개인정보 등)가 포함된 DB는 연결 전 보안 검토가 필요합니다.

---

## 관련 문서

- [MCP PostgreSQL Server GitHub](https://github.com/modelcontextprotocol/servers/tree/main/src/postgres)
