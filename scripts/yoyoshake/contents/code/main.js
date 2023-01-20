/*
 * Copyright (C) 2019 Vlad Zahorodnii <vladzzag@gmail.com>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var config = {
    threshold: 100
};

function performMinimize() {
    var candidates = workspace.clientList();

    var relevantClients = candidates.filter(function (client) {
        if (!client.minimizable) {
            return false;
        }
        if (client.onAllDesktops) {
            return false;
        }
        if (client.desktop != workspace.currentDesktop) {
            return false;
        }
        if (client.move) {
            return false;
        }
        return true;
    });

    var minimize = relevantClients.some(function (client) {
        return !client.minimized;
    });

    relevantClients.forEach(function (client) {
        var wasMinimizedByScript = client.minimizedByScript;
        delete client.minimizedByScript;

        if (minimize) {
            if (client.minimized) {
                return;
            }
            client.minimized = true;
            client.minimizedByScript = true;
        } else {
            if (!wasMinimizedByScript) {
                return;
            }
            client.minimized = false;
        }
    });
}

function handleMoveResizeStarted(client) {
    if (!client.move) {
        return;
    }

    var state = {
        originalX: client.x,
        originalY: client.y,
        previousX: client.x,
        previousY: client.y,
        averageX: 0,
        averageY: 0,
        distance: 0,
        stepCount: 0
    };

    client.state = state;
}

function computeNextState(client, state) {
    var deltaX = client.x - state.previousX;
    var deltaY = client.y - state.previousY;

    return {
        originalX: state.originalX,
        originalY: state.originalY,
        previousX: client.x,
        previousY: client.y,
        averageX: state.averageX + (client.x - state.averageX) / (state.stepCount + 1),
        averageY: state.averageY + (client.y - state.averageY) / (state.stepCount + 1),
        distance: state.distance + Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        stepCount: state.stepCount + 1
    };
}

function handleMoveResizeStepped(client) {
    if (!client.move) {
        return;
    }
    if (!client.state) {
        return;
    }

    // QScriptEngine is very buggy. For some reason, it's not possible to mutate
    // the stored state object. The only option we have is to create a new state
    // object and replace the old one. Not great, not terrible!
    client.state = computeNextState(client, client.state);

    // That's a super duper naive shake gesture detection algorithm. Though we
    // still need to take time into account when determining whether the moving
    // window has been shaken.
    if (client.state.distance < 4 * config.threshold) {
        return;
    }

    var deltaX = client.state.averageX - client.state.originalX;
    var deltaY = client.state.averageY - client.state.originalY;
    var moved = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (moved > config.threshold) {
        return;
    }

    performMinimize();

    delete client.state;
}

function registerClient(client) {
    client.clientStartUserMovedResized.connect(handleMoveResizeStarted);
    client.clientStepUserMovedResized.connect(handleMoveResizeStepped);
}

function reconfigure() {
    config.threshold = readConfig("Threshold", 100);
}

options.configChanged.connect(reconfigure);
reconfigure();

workspace.clientAdded.connect(registerClient);
workspace.clientList().forEach(registerClient);
