#!/bin/bash

# API Test Script for Photobooth Backend
# Assumes backend is already running on port 3000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:3000"

# Check if backend is running
check_backend() {
    echo -e "${BLUE}Checking if backend is running...${NC}"
    
    # Prüfe ob Port 3000 belegt ist
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is running on port 3000${NC}"
        return 0
    fi
    
    # Alternativ: Versuche einen einfachen Request
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/settings" 2>/dev/null | grep -q "200\|201\|400\|401\|404\|500"; then
        echo -e "${GREEN}✓ Backend is responding${NC}"
        return 0
    fi
    
    echo -e "${RED}✗ Backend is not running on port 3000${NC}"
    echo -e "${YELLOW}Please start the backend first: npx nx serve backend${NC}"
    exit 1
}

# Test function wrapper
test_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "\n${BLUE}Testing: $description${NC}"
    echo -e "  ${method} ${BASE_URL}${endpoint}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}${endpoint}" -H "Accept: application/json")
    elif [ "$method" = "POST" ] || [ "$method" = "PUT" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X ${method} "${BASE_URL}${endpoint}" \
                -H "Content-Type: application/json" \
                -H "Accept: application/json" \
                -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X ${method} "${BASE_URL}${endpoint}" \
                -H "Accept: application/json")
        fi
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "${BASE_URL}${endpoint}" \
            -H "Accept: application/json")
    fi
    
    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n 1)
    # Extract body (all except last line) - macOS compatible
    if [ "$(uname)" = "Darwin" ]; then
        # macOS doesn't support negative line counts in head
        total_lines=$(echo "$response" | wc -l | tr -d ' ')
        if [ "$total_lines" -gt 1 ]; then
            body=$(echo "$response" | head -n $((total_lines - 1)))
        else
            body=""
        fi
    else
        body=$(echo "$response" | head -n -1)
    fi
    
    # Check status code
    if [[ "$status_code" =~ ^2[0-9][0-9]$ ]]; then
        echo -e "  ${GREEN}✓ Status: $status_code${NC}"
        if [ ${#body} -gt 200 ]; then
            echo -e "  Response: $(echo "$body" | head -c 200)..."
        else
            echo -e "  Response: $body"
        fi
    else
        echo -e "  ${RED}✗ Status: $status_code${NC}"
        echo -e "  Error: $body"
    fi
}

# Main test suite
run_tests() {
    echo -e "${YELLOW}=== Photobooth API Test Suite ===${NC}\n"
    
    # Check backend first
    check_backend
    
    # Health & Info
    echo -e "\n${YELLOW}--- Health & Info ---${NC}"
    test_api "GET" "/" "" "Health Check"
    
    # Settings API
    echo -e "\n${YELLOW}--- Settings API ---${NC}"
    test_api "GET" "/api/settings" "" "Get current settings"
    test_api "GET" "/api/settings/section/camera" "" "Get camera settings"
    
    # Gallery API
    echo -e "\n${YELLOW}--- Gallery API ---${NC}"
    test_api "GET" "/api/gallery?page=1&limit=5" "" "Get gallery (page 1, limit 5)"
    test_api "GET" "/api/gallery/latest?limit=3" "" "Get latest 3 images"
    test_api "GET" "/api/gallery/stats" "" "Get gallery statistics"
    
    # Hardware Status
    echo -e "\n${YELLOW}--- Hardware API ---${NC}"
    test_api "GET" "/api/hardware/status" "" "Get hardware status"
    test_api "GET" "/api/hardware/camera/settings" "" "Get camera settings"
    
    # Capture API (nur Info-Endpoints)
    echo -e "\n${YELLOW}--- Capture API ---${NC}"
    test_api "GET" "/api/capture/preview?width=640&height=480&format=jpeg" "" "Get camera preview"
    
    # Print API
    echo -e "\n${YELLOW}--- Print API ---${NC}"
    test_api "GET" "/api/print/queue" "" "Get print queue"
    
    # Admin API (nur Status)
    echo -e "\n${YELLOW}--- Admin API ---${NC}"
    test_api "GET" "/api/admin/status" "" "Get system status"
    
    # Chromakeying API
    echo -e "\n${YELLOW}--- Chromakeying API ---${NC}"
    test_api "GET" "/api/chromakeying/backgrounds" "" "Get available backgrounds"
    
    echo -e "\n${GREEN}=== Test Suite Complete ===${NC}\n"
}

# Interactive mode
interactive_test() {
    echo -e "${YELLOW}=== Interactive API Test Mode ===${NC}\n"
    check_backend
    
    while true; do
        echo -e "\n${BLUE}Choose an option:${NC}"
        echo "1) Run all tests"
        echo "2) Test specific endpoint"
        echo "3) Send custom request"
        echo "4) Exit"
        
        read -p "Selection: " choice
        
        case $choice in
            1)
                run_tests
                ;;
            2)
                echo -e "\n${BLUE}Common endpoints:${NC}"
                echo "  /api/settings"
                echo "  /api/gallery"
                echo "  /api/hardware/status"
                echo "  /api/capture/preview"
                echo "  /api/print/queue"
                read -p "Enter endpoint: " endpoint
                read -p "Method (GET/POST/PUT/DELETE): " method
                if [[ "$method" =~ ^(POST|PUT)$ ]]; then
                    read -p "JSON data (optional): " data
                    test_api "$method" "$endpoint" "$data" "Custom test"
                else
                    test_api "$method" "$endpoint" "" "Custom test"
                fi
                ;;
            3)
                read -p "Full curl command: " curl_cmd
                echo -e "${BLUE}Executing: $curl_cmd${NC}"
                eval $curl_cmd
                ;;
            4)
                echo "Goodbye!"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option${NC}"
                ;;
        esac
    done
}

# Main execution
if [ "$1" = "-i" ] || [ "$1" = "--interactive" ]; then
    interactive_test
else
    run_tests
fi