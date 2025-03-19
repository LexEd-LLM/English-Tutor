import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ui.interface import create_quiz_interface

def main():
    demo = create_quiz_interface()
    demo.launch(share=False)

if __name__ == "__main__":
    main()