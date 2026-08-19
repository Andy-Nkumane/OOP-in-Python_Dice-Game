"""Dependency-free web server for the Dice Poker browser interface."""

import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from DicePoker import DicePoker
from multi_sided_die import MultiSidedDie


ROOT = Path(__file__).parent
WEB_ROOT = ROOT / "web"
games = {}


def game_state(game):
    labels = {
        "Skip": "No winning hand",
        "Pair": "Pair",
        "TwoPair": "Two pair",
        "ThreeKind": "Three of a kind",
        "FullHouse": "Full house",
        "FourKind": "Four of a kind",
        "Straight": "Straight",
        "FiveKind": "Five of a kind",
    }
    payouts = {
        "Skip": 0,
        "Pair": 2,
        "TwoPair": 5,
        "ThreeKind": 8,
        "FullHouse": 12,
        "FourKind": 15,
        "Straight": 20,
        "FiveKind": 30,
    }
    kind = getattr(game, "kind", "")
    return {
        "score": game.score,
        "dice": getattr(game, "dice", []),
        "hand": labels.get(kind, ""),
        "kind": kind,
        "points": payouts.get(kind, 0),
        "gameOver": game.score < 10,
    }


class DicePokerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def log_message(self, fmt, *args):
        print(f"{self.address_string()} - {fmt % args}")

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            return json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            return None

    def do_POST(self):
        data = self.read_json()
        if data is None:
            return self.send_json({"error": "Invalid JSON."}, 400)

        if self.path == "/api/game":
            sides = data.get("sides")
            starting_score = data.get("startingScore", 100)
            if not isinstance(sides, int) or not 4 <= sides <= 20:
                return self.send_json({"error": "Choose between 4 and 20 sides."}, 400)
            if not isinstance(starting_score, int) or isinstance(starting_score, bool) or starting_score < 10:
                return self.send_json({"error": "Starting points must be at least 10."}, 400)
            game = DicePoker(MultiSidedDie(sides), starting_score)
            game_id = str(id(game))
            games[game_id] = game
            return self.send_json({"gameId": game_id, **game_state(game)}, 201)

        game_id = data.get("gameId")
        game = games.get(game_id)
        if not game:
            return self.send_json({"error": "Game not found. Start a new game."}, 404)

        if self.path == "/api/roll":
            if game.score < 10:
                return self.send_json({"error": "Not enough points for another round."}, 400)
            game.play_get_value()
            game.play()
            return self.send_json(game_state(game))

        if self.path == "/api/score":
            game.new_score()
            return self.send_json(game_state(game))

        if self.path == "/api/reroll":
            indexes = data.get("indexes", [])
            if not isinstance(indexes, list) or any(not isinstance(i, int) for i in indexes):
                return self.send_json({"error": "Invalid dice selection."}, 400)
            if len(set(indexes)) > 5 or any(i < 0 or i >= 5 for i in indexes):
                return self.send_json({"error": "Select up to five dice."}, 400)
            for index in set(indexes):
                game.dice[index] = game.roll()
            game.play()
            game.new_score()
            return self.send_json(game_state(game))

        self.send_json({"error": "Unknown endpoint."}, 404)


def main():
    address = ("127.0.0.1", 8000)
    print(f"Dice Poker is running at http://{address[0]}:{address[1]}")
    ThreadingHTTPServer(address, DicePokerHandler).serve_forever()


if __name__ == "__main__":
    main()
