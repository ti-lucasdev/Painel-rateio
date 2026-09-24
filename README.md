# Grupo Fit Seven - Salas Comerciais

Aplicação desktop Windows para calcular e registrar rateios de aluguel e energia para qualquer quantidade de imóveis.

## Arquitetura

- `src/main`: ciclo de vida do Windows/Electron e persistência local.
- `src/preload`: ponte segura entre a interface e o processo principal.
- `src/shared`: modelos, validações e motor de cálculo puro.
- `src/renderer`: interface, componentes e estilos, sem acesso direto ao sistema operacional.

Os dados são mantidos apenas durante a sessão aberta; eles não dependem de internet. Esta versão não mantém histórico mensal nem recupera imóveis cadastrados ao abrir novamente o aplicativo.

Ao abrir, os campos de texto e datas ficam vazios, os valores num?ricos ficam em zero e n?o h? im?veis nem taxas cadastrados.

## Regras definidas

- Ao abrir, os campos de texto e datas ficam vazios, os valores numéricos ficam em zero e não há imóveis nem taxas cadastrados.

- Taxas fixas de cada conta são divididas igualmente entre os imóveis ativos que participam daquela conta.
- O consumo de cada inquilino corresponde à leitura atual menos a anterior. O valor variável da fatura é dividido proporcionalmente aos consumos medidos, com o total exibido no quadro de resultados à direita.
- Não há banco de dados, histórico de competências ou restauração automática da sessão nesta versão.

## Exportação em PDF

O botão **Gerar / abrir PDF** salva o demonstrativo na pasta `Documentos/Grupo Fit Seven - Salas Comerciais` e o abre no leitor de PDF padrão do Windows. Cada imóvel cadastrado ocupa uma página A4, com suas leituras, consumo da unidade, consumo total da fatura, tarifa variável e valores do rateio. A impressão pode ser feita pelo próprio leitor de PDF.

## Comandos

```powershell
npm install
npm run dev
npm run dist:win
```

O último comando cria o executável portátil `Grupo Fit Seven - Salas Comerciais.exe` e o instalador `Grupo Fit Seven - Salas Comerciais - Setup-0.1.0.exe` na pasta `release`.
