---
title: "Jira / Confluence MCP 연동 가이드"
description: "mcp-atlassian을 활용해 Claude Code에서 Jira 이슈 조회·생성, Confluence 문서 탐색을 자연어로 처리하는 방법을 정리했습니다."
publishDate: "2026-03-06"
tags: ["claude", "mcp", "jira", "confluence", "atlassian", "ai"]
---

## 개요

Jira와 Confluence를 Claude Code MCP로 연동하면, 터미널을 벗어나지 않고 이슈 조회·생성·댓글 추가, 문서 검색 등을 자연어로 처리할 수 있습니다.

---

## 사전 준비

### Personal Access Token 발급

**Jira**

1. Jira 접속 → 우측 상단 프로필 → **Account Settings** → **Security**
2. **Personal Access Token** 섹션에서 토큰 생성
3. 생성된 토큰 값 복사

**Confluence**

1. Confluence 접속 → 우측 상단 프로필 → **Profile** → **Personal Access Tokens**
2. 토큰 생성 후 복사

---

## 설치

`mcp-atlassian` 패키지는 `uvx`로 실행합니다. `uv`가 없다면 먼저 설치합니다.

```bash
brew install uv
```

---

## Claude Code 전역 설정

`~/.claude.json` 파일의 `mcpServers` 섹션에 아래 내용을 추가합니다.

```json
{
  "mcpServers": {
    "mcp-atlassian": {
      "command": "uvx",
      "args": ["mcp-atlassian"],
      "env": {
        "JIRA_URL": "https://jira.yourcompany.com",
        "JIRA_USERNAME": "your_id@yourcompany.com",
        "JIRA_PERSONAL_TOKEN": "<Jira Personal Access Token>",
        "CONFLUENCE_URL": "https://confluence.yourcompany.com",
        "CONFLUENCE_USERNAME": "your_id@yourcompany.com",
        "CONFLUENCE_PERSONAL_TOKEN": "<Confluence Personal Access Token>"
      }
    }
  }
}
```

> `~/.claude.json`은 숨김 파일입니다. `open ~/.claude.json` 또는 터미널 편집기로 수정하세요.

---

## 설정 위치

| 설정 파일 | 적용 범위 |
|-----------|-----------|
| `~/.claude.json` → `mcpServers` | **전역** (모든 프로젝트에서 사용 가능) |
| 프로젝트 루트 `.mcp.json` | 해당 프로젝트에서만 사용 |

전역 설정을 권장합니다.

---

## 연동 확인

Claude Code를 재시작한 후 새 세션에서 테스트합니다.

```
Jira에서 내가 담당한 이슈 목록 보여줘
Confluence에서 "배포 가이드" 페이지 찾아줘
```

---

## 사용 가능한 주요 기능

**Jira**

- 이슈 검색 / 조회 / 생성 / 수정
- 스프린트 관리
- 댓글 추가 / 상태 전환
- 워크로그 기록

**Confluence**

- 페이지 검색 / 조회 / 생성 / 수정
- 댓글 추가
- 첨부파일 다운로드

---

## 브랜치 생성 연계

Jira 이슈 키를 포함한 브랜치명 규칙을 사용하는 경우, Claude Code에서 이슈를 조회한 후 바로 브랜치 생성에 활용할 수 있습니다.

```bash
# 예시
git checkout -b feature/PROJ-12345-기능명
```

---

## 관련 문서

- [mcp-atlassian GitHub](https://github.com/sooperset/mcp-atlassian)
