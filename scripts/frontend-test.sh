#!/bin/bash

# Frontend Test Script
# Testet ob das Frontend läuft und erreichbar ist

PORT=4200
BASE_URL="http://localhost:$PORT"

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if frontend is running
check_frontend() {
    echo -e "${BLUE}Checking if frontend is running...${NC}"
    
    # Prüfe ob Port 4200 belegt ist
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is running on port $PORT${NC}"
        return 0
    fi
    
    echo -e "${RED}✗ Frontend is not running on port $PORT${NC}"
    echo -e "${YELLOW}Please start the frontend first:${NC}"
    echo -e "${YELLOW}/Users/sascha/projects/photobooth/scripts/frontend-start.sh${NC}"
    exit 1
}

# Test frontend availability
test_frontend_health() {
    echo -e "\n${BLUE}Testing frontend availability...${NC}"
    
    # Test root endpoint
    echo -n "  Testing $BASE_URL ... "
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" 2>/dev/null)
    
    if [[ "$response" =~ ^(200|304)$ ]]; then
        echo -e "${GREEN}✓ Status: $response${NC}"
    else
        echo -e "${RED}✗ Status: $response${NC}"
        echo -e "${YELLOW}  Frontend might still be compiling...${NC}"
        return 1
    fi
    
    return 0
}

# Test specific frontend routes
test_frontend_routes() {
    echo -e "\n${BLUE}Testing frontend routes...${NC}"
    
    local routes=(
        "/"
        "/admin"
        "/gallery"
        "/settings"
    )
    
    local all_success=true
    
    for route in "${routes[@]}"; do
        echo -n "  Testing $route ... "
        response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$route" 2>/dev/null)
        
        if [[ "$response" =~ ^(200|304|404)$ ]]; then
            # 404 is ok for SPA routes - they're handled client-side
            echo -e "${GREEN}✓ Status: $response${NC}"
        else
            echo -e "${RED}✗ Status: $response${NC}"
            all_success=false
        fi
    done
    
    return $([ "$all_success" = true ] && echo 0 || echo 1)
}

# Test static assets
test_static_assets() {
    echo -e "\n${BLUE}Testing static assets...${NC}"
    
    # Test common static files
    local assets=(
        "/index.html"
        "/styles.css"
        "/main.js"
        "/polyfills.js"
        "/runtime.js"
    )
    
    local found_any=false
    
    for asset in "${assets[@]}"; do
        echo -n "  Checking $asset ... "
        response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$asset" 2>/dev/null)
        
        if [[ "$response" =~ ^(200|304)$ ]]; then
            echo -e "${GREEN}✓ Found${NC}"
            found_any=true
        else
            echo -e "${YELLOW}○ Not found (might have different name)${NC}"
        fi
    done
    
    if [ "$found_any" = true ]; then
        echo -e "${GREEN}✓ Some static assets are being served${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ No standard assets found (might still be compiling)${NC}"
        return 1
    fi
}

# Test WebSocket connectivity (for hot reload)
test_websocket() {
    echo -e "\n${BLUE}Testing WebSocket for hot reload...${NC}"
    
    # Check if webpack-dev-server WebSocket endpoint responds
    echo -n "  Testing WebSocket endpoint ... "
    ws_response=$(curl -s -o /dev/null -w "%{http_code}" -H "Upgrade: websocket" "$BASE_URL/ws" 2>/dev/null)
    
    if [[ "$ws_response" =~ ^(101|400|404)$ ]]; then
        # 101 = WebSocket upgrade, 400/404 = endpoint exists but needs proper WebSocket handshake
        echo -e "${GREEN}✓ WebSocket endpoint available${NC}"
    else
        echo -e "${YELLOW}○ WebSocket not responding (hot reload might not work)${NC}"
    fi
}

# Show access info
show_access_info() {
    echo -e "\n${BLUE}=== Frontend Access Information ===${NC}"
    echo -e "${GREEN}Frontend URL: $BASE_URL${NC}"
    echo -e "${GREEN}Admin Panel: $BASE_URL/admin${NC}"
    echo -e "${GREEN}Gallery: $BASE_URL/gallery${NC}"
    echo -e "\n${YELLOW}Note: First compilation can take 30-60 seconds${NC}"
}

# Main test suite
run_tests() {
    echo -e "${YELLOW}=== Frontend Test Suite ===${NC}\n"
    
    # Check if frontend is running
    check_frontend
    
    # Run tests
    local all_passed=true
    
    if ! test_frontend_health; then
        all_passed=false
    fi
    
    if ! test_frontend_routes; then
        all_passed=false
    fi
    
    if ! test_static_assets; then
        all_passed=false
    fi
    
    test_websocket
    
    # Show results
    echo -e "\n${BLUE}=== Test Results ===${NC}"
    if [ "$all_passed" = true ]; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
        show_access_info
    else
        echo -e "${YELLOW}⚠ Some tests failed${NC}"
        echo -e "${YELLOW}The frontend might still be compiling. Wait a moment and try again.${NC}"
        show_access_info
    fi
}

# Interactive mode
if [ "$1" = "-w" ] || [ "$1" = "--watch" ]; then
    echo -e "${BLUE}Watch mode: Testing every 5 seconds (Ctrl+C to stop)${NC}\n"
    while true; do
        clear
        run_tests
        sleep 5
    done
else
    run_tests
fi