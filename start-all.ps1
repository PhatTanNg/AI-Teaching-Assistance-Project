# Start all services for AI Teaching Assistant

Write-Host "Starting AI Teaching Assistant Services..." -ForegroundColor Green

# Start Node.js backend
Write-Host "`n[1/3] Starting Node.js Backend (Port 5001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# Wait a bit for Node backend to start
Start-Sleep -Seconds 3

# Start Python backend
Write-Host "[2/3] Starting Python Backend (Port 5002)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd python-backend; python app.py"

# Wait a bit for Python backend to start
Start-Sleep -Seconds 3

# Start frontend
Write-Host "[3/3] Starting Frontend (Port 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`n✅ All services started!" -ForegroundColor Green
Write-Host "`nServices running at:" -ForegroundColor Yellow
Write-Host "  - Frontend:        http://localhost:5173" -ForegroundColor White
Write-Host "  - Node Backend:    http://localhost:5001" -ForegroundColor White
Write-Host "  - Python Backend:  http://localhost:5002" -ForegroundColor White
Write-Host "`nPress Ctrl+C in each terminal to stop services." -ForegroundColor Gray
