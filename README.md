# Super Changelog

## Description
Esta action procura a versão lançada recentemente da tag do repositório e verifica se ela atende aos seguintes requisitos:

- v1.0.0
- 1.0.0

Esta action também altera a versão do arquivo `package.json` da branch padrão e gera o changelog.


## Requisitos:
- Existir uma tag no repositório

## Exemplos

```yml
uses: archaic10/super-changelog@main
with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    path: '/src'
```
## Ou

```yml
uses: archaic10/super-changelog@main
with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
```