#!/bin/bash

# Otterscan Local Runner
# Runs both the API server and SSR frontend locally

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Default values
ERIGON_URL="${ERIGON_URL:-https://ethscan.org/erigon/}"
API_PORT="${API_PORT:-3001}"
FRONTEND_PORT="${PORT:-3000}"
MODE="production"

# PID file locations
API_PID_FILE="/tmp/otterscan-api.pid"
FRONTEND_PID_FILE="/tmp/otterscan-frontend.pid"

# Help message
show_help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start       Start both API and frontend (default)"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  status      Show service status"
    echo "  logs        Show logs (tail both services)"
    echo "  build       Build the frontend"
    echo "  dev         Start in development mode"
    echo ""
    echo "Options:"
    echo "  -e, --erigon URL    Set Erigon RPC URL (default: $ERIGON_URL)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  ERIGON_URL          Erigon RPC endpoint"
    echo "  API_PORT            API server port (default: 3001)"
    echo "  PORT                Frontend port (default: 3000)"
    echo ""
    echo "Examples:"
    echo "  $0 start                              # Start in production mode"
    echo "  $0 dev                                # Start in development mode"
    echo "  $0 start -e http://localhost:8545    # Use local Erigon"
    echo "  $0 stop                               # Stop all services"
    echo ""
}

# Check if a process is running
is_running() {
    local pid_file="$1"
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Stop a service
stop_service() {
    local name="$1"
    local pid_file="$2"

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "  Stopping $name (PID: $pid)..."
            kill "$pid" 2>/dev/null || true
            sleep 1
            # Force kill if still running
            if ps -p "$pid" > /dev/null 2>&1; then
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
        rm -f "$pid_file"
    fi
}

# Start API server
start_api() {
    echo -e "${BLUE}Starting API server...${NC}"

    cd "$SCRIPT_DIR/api"

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "  Installing API dependencies..."
        npm install
    fi

    # Start API server in background
    ERIGON_URL="$ERIGON_URL" PORT="$API_PORT" node server.js > /tmp/otterscan-api.log 2>&1 &
    echo $! > "$API_PID_FILE"

    echo -e "  ${GREEN}API server started on port $API_PORT${NC}"
    cd "$SCRIPT_DIR"
}

# Start frontend server
start_frontend() {
    local mode="$1"

    echo -e "${BLUE}Starting frontend server...${NC}"

    cd "$SCRIPT_DIR"

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "  Installing frontend dependencies..."
        npm install
    fi

    if [ "$mode" = "dev" ]; then
        # Development mode - use vite dev server with SSR
        echo -e "  Starting in ${YELLOW}development${NC} mode..."
        VITE_API_URL="http://localhost:$API_PORT" VITE_ASSETS_URL="${VITE_ASSETS_URL:-https://ethscan.org}" node server.js > /tmp/otterscan-frontend.log 2>&1 &
    else
        # Production mode - always rebuild to pick up source changes
        echo -e "  Building frontend..."
        npm run build

        echo -e "  Starting in ${GREEN}production${NC} mode..."
        NODE_ENV=production PORT="$FRONTEND_PORT" VITE_API_URL="http://localhost:$API_PORT" node server.js > /tmp/otterscan-frontend.log 2>&1 &
    fi

    echo $! > "$FRONTEND_PID_FILE"
    echo -e "  ${GREEN}Frontend server started on port $FRONTEND_PORT${NC}"
}

# Parse arguments
COMMAND="start"
while [[ $# -gt 0 ]]; do
    case $1 in
        start|stop|restart|status|logs|build|dev)
            COMMAND="$1"
            shift
            ;;
        -e|--erigon)
            ERIGON_URL="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}   Otterscan Local Runner      ${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Execute command
case $COMMAND in
    start)
        echo -e "${GREEN}Starting Otterscan (production mode)...${NC}"
        echo -e "  Erigon URL: ${YELLOW}$ERIGON_URL${NC}"
        echo ""

        # Stop any existing services first
        stop_service "API" "$API_PID_FILE"
        stop_service "Frontend" "$FRONTEND_PID_FILE"

        start_api
        sleep 2  # Wait for API to start
        start_frontend "production"

        echo ""
        echo -e "${GREEN}Services started!${NC}"
        echo -e "  Frontend: ${BLUE}http://localhost:$FRONTEND_PORT${NC}"
        echo -e "  API:      ${BLUE}http://localhost:$API_PORT${NC}"
        echo ""
        echo -e "Run '${YELLOW}$0 logs${NC}' to view logs"
        echo -e "Run '${YELLOW}$0 stop${NC}' to stop services"
        ;;

    dev)
        echo -e "${GREEN}Starting Otterscan (development mode)...${NC}"
        echo -e "  Erigon URL: ${YELLOW}$ERIGON_URL${NC}"
        echo ""

        # Stop any existing services first
        stop_service "API" "$API_PID_FILE"
        stop_service "Frontend" "$FRONTEND_PID_FILE"

        start_api
        sleep 2  # Wait for API to start
        start_frontend "dev"

        echo ""
        echo -e "${GREEN}Services started in development mode!${NC}"
        echo -e "  Frontend: ${BLUE}http://localhost:$FRONTEND_PORT${NC}"
        echo -e "  API:      ${BLUE}http://localhost:$API_PORT${NC}"
        echo ""
        echo -e "Run '${YELLOW}$0 logs${NC}' to view logs"
        echo -e "Run '${YELLOW}$0 stop${NC}' to stop services"
        ;;

    stop)
        echo -e "${YELLOW}Stopping Otterscan...${NC}"
        stop_service "API" "$API_PID_FILE"
        stop_service "Frontend" "$FRONTEND_PID_FILE"
        echo -e "${GREEN}Services stopped${NC}"
        ;;

    restart)
        echo -e "${YELLOW}Restarting Otterscan...${NC}"
        $0 stop
        sleep 1
        $0 start
        ;;

    status)
        echo -e "${BLUE}Service Status:${NC}"
        echo ""

        if is_running "$API_PID_FILE"; then
            pid=$(cat "$API_PID_FILE")
            echo -e "  API Server:      ${GREEN}Running${NC} (PID: $pid)"
        else
            echo -e "  API Server:      ${RED}Stopped${NC}"
        fi

        if is_running "$FRONTEND_PID_FILE"; then
            pid=$(cat "$FRONTEND_PID_FILE")
            echo -e "  Frontend Server: ${GREEN}Running${NC} (PID: $pid)"
        else
            echo -e "  Frontend Server: ${RED}Stopped${NC}"
        fi
        ;;

    logs)
        echo -e "${BLUE}Showing logs (Ctrl+C to exit)...${NC}"
        echo ""
        tail -f /tmp/otterscan-api.log /tmp/otterscan-frontend.log 2>/dev/null || echo "No logs found. Services may not be running."
        ;;

    build)
        echo -e "${YELLOW}Building frontend...${NC}"
        cd "$SCRIPT_DIR"
        npm run build
        echo -e "${GREEN}Build complete${NC}"
        ;;
esac
