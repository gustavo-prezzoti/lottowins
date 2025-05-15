@echo off
REM Script para executar migrações SQL

echo Executando migração para adicionar coluna special_number...
python run_migration.py migrations/add_special_number_column.sql

if %ERRORLEVEL% NEQ 0 (
    echo Erro ao executar a migração!
    exit /b %ERRORLEVEL%
)

echo Migração concluída com sucesso!
exit /b 0 