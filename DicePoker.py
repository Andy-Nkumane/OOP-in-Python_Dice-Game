# Import packages
from itertools import groupby
from multi_sided_die import MultiSidedDie

# Class definition for dice poker game
class DicePoker:

    # Initialiser
    def __init__(self, die_side_num):
        """Initializes score to 100 and takes in another object MultiSidedDie as msd"""
        self.score = 100
        self.msd = die_side_num

    def get_value(self):
        """Returns the current score and the list of the rolled die"""
        result = f"\nScore: {self.score} \nRoll: {self.dice}"
        return result

    def play_get_value(self):
        """Deducts 10 from the current score for playing the game, rolls the die 5 times by calling the roll function.
        Sorts the dice list in ascending order and returns the method get_value()"""
        self.dice = []
        self.score -= 10
        for i in range(5):
            self.dice.append(self.roll())
        self.dice.sort()
        return self.get_value()

    def roll_again(self, change):
        """Second chance rolling, changing a few or all dice rolls. By accepting the value to be changed in the list and replacing it
        with the new value from the dice roll in method roll()."""
        if change in self.dice:
            print(f"Changes {change}: new roll: {self.roll()}")
            for i in range(len(self.dice)):
                if self.dice[i] == change:  # and  not(new_roll):
                    self.dice[i] = self.msd.get_value()
                    return False
        elif change == 0:
            pass
        else:
            print(change)
            print(self.dice)
            print("Invalid value!!")
            return True

    def roll(self):
        """Calling method roll() from msd to give a random number for the dice and also calling method get_value to retrieve the value."""
        self.msd.roll()
        return self.msd.get_value()

    def play(self):
        self.kind = ""
        self.hand_check()

    def new_score(self):
        """Adds to the current score according to a payout schedule. If the user got a two pairs, three of a kind, full house, four of a kind,
        straight or five of a kind, else they get nothing"""
        if self.kind == "TwoPair":
            self.score += 5
        elif self.kind == "ThreeKind":
            self.score += 8
        elif self.kind == "FullHouse":
            self.score += 12
        elif self.kind == "FourKind":
            self.score += 15
        elif self.kind == "Straight":
            self.score += 20
        elif self.kind == "FiveKind":
            self.score += 30

    def hand_check(self):
        """Sorts the dice list in ascending order and then checks for a matching pattern of two pairs, three of a kind, full house, four of a kind,
        straight or five of a kind"""
        self.dice.sort()
        kind = [len(list(group)) for key, group in groupby(self.dice)]
        if len(kind) == 3:
            if 2 in kind:
                print("\n**Two Pair: +5")
                self.kind = "TwoPair"
            else:
                print("\n**Three of a kind: +8")
                self.kind = "ThreeKind"
        elif len(kind) == 2:
            if (2 in kind) and (3 in kind):
                print("\n**Full House: +12")
                self.kind = "FullHouse"
            else:
                print("\n**Four of a Kind: +15")
                self.kind = "FourKind"
        elif len(kind) == 5:
            strait = True
            try:
                for i in range(self.dice[0], self.dice[-1] + 1):
                    if not (i == self.dice[i - 1]):
                        strait = False
            except:
                strait = False
            if strait:
                print("\n**Straight: +20")
                self.kind = "Straight"
        elif len(kind) == 1:
            print("\n**Five of a Kind: +30")
            self.kind = "FiveKind"


# Instantiating classes
die_side_num = int(input("Enter number of sides the dice will have: "))
die = MultiSidedDie(die_side_num)
rol = DicePoker(die)

# Print current score. Roll dice 5 times by calling play_get_value() method.
print(f"Score: {rol.score}")
play_again = "y"
while (play_again == "y") and (rol.score > 9):
    print(rol.play_get_value())
    rol.play()

    # Option for a second chances is granted, should the user feel disastisfied with the current die roll. The user can change a few or all die rolls.
    second_chance = ""
    while not ((second_chance == "y") or (second_chance == "n")):
        second_chance = input(
            'Do you want to use your second chance? "y" for yes, "n" for no: '
        )

        # When user chooses to use their second chance, they will be prompted to enter of dice rolls they want to change.
        if second_chance == "y":
            print("Second Chance Invoked")
            roll_num = int(input("How many die do you want to re-roll? "))

            # If the number of dice roll change is greater than 5 or smaller than 1, an appropriate error message will be displayed and will be prompted again to enter number of dice rolls to change.
            while (roll_num < 1) or (roll_num > 5):
                print("\n >> Invalid entry!! Entry should be 1-5 <<")
                roll_num = int(input("How many die do you want to re-roll? "))

            # Iterating over the number of specified for die roll change, user inserts the value that needs to be changed.
            for i in range(roll_num):
                changes = int(
                    input(
                        'Enter value you wish to change, to skip 1 dice roll enter "0": '
                    )
                )

                # Method roll_again() returns True or False. If True is returned, an invalid number was entered and the user has to re-enter until a valid number has been entered.
                while rol.roll_again(changes):
                    changes = int(input("Enter value you wish to change: "))

            # At the end of changing die roll, method hand_check() is called to check new hand for patterns specified in hand_check(), method get_value() is displayed and method new_score() is called.
            rol.hand_check()
            print(rol.get_value())
            rol.new_score()

        # When the user chooses not to use their second chance, method new_score() is called.
        elif second_chance == "n":
            rol.new_score()

        # Inserted value does not equal 'y' or 'n'. Appropriate error message is displayed.
        else:
            print("Invalid input!! Try again")

    # displays new score after round cost deduction and if any score increase from winning hand.
    print(f"New score: {rol.score}")

    # If score goes below 10, it is game over as user does not have enough to play another round.
    if rol.score < 10:
        print("** Game Over! **")
        exit()

    # Prompts user to continue playing or quit playing after each round of playing
    else:
        play_again = input(
            'Do you want to play again? "y" for yes, any character to stop: '
        )
