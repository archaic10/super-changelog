![img](https://github.com/madeiramadeirabr/action-generate-changelog/blob/production/img/action-generate-changelog.svg)
# action-generate-changelog

## Description
Esta action procura a versão lançada recentemente da tag do repositório e verifica se ela atende aos seguintes requisitos:

- v1.0.0
- 1.0.0

Esta action também altera a versão do arquivo `package.json` da branch padrão e gera o changelog.

## Squad:
[SRE Team](https://github.com/orgs/madeiramadeirabr/teams/team-platform-services 'SRE Team')

## Requisitos:
- Existir uma tag no repositório

## Exemplos

```yml
uses: madeiramadeirabr/action-generate-changelog@0.1.3
with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    path: '/src'
```
## Ou

```yml
uses: madeiramadeirabr/action-generate-changelog@0.1.3
with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
```