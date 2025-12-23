@echo off
echo Checking fake-indexeddb installation...
if exist node_modules\fake-indexeddb (
    echo fake-indexeddb is installed
) else (
    echo fake-indexeddb NOT found, installing dependencies...
    npm install
)
echo.
echo Running tests...
npm run test:run
