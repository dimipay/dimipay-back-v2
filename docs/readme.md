# Document

디미페이 백엔드의 문서 자동화 시스템 입니다.

## files

`files` 폴더에는 3가지의 `json` 파일이 있습니다.

- `default-swagger.json` - 문서 기본 정보가 들어있습니다.
- `response.json` - path별 response를 작성할 수 있습니다.
- `swagger.json` - 위 두 파일을 취합한 최종 문서 파일입니다.

## cli

## usage

```
Usage: yarn docs [command]

Commands:
  res
  swagger
  server
  help [command]  display help for command
```

### res

```
yarn docs res
```

`response.json` 파일을 업데이트 합니다. 기존에 쓰여진 내용은 보존되지만, 삭제된 라우터에대한 설명은 유지되지 않습니다.

### swagger

```
yarn docs swagger
```

현재 존재하는 라우터를 바탕으로 문서를 제작합니다.

### server

```
yarn docs server
```

문서 서버를 엽니다.
