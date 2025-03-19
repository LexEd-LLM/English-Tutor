import os
import glob
import json
from datasets import Dataset
from dotenv import load_dotenv

load_dotenv()

TEACHER_SYSTEM_PROMPT = """You are an English teacher for 12th grade students in Vietnam. Your task is to support students in their English learning process, answer their questions, and explain concepts in a clear, thorough manner.
Use Vietnamese for explanations, discussions, and guidance. Only use English for lessons, exercises, or when answering questions of a technical nature.
Be attentive, encouraging, and confidence-building. Guide step by step, provide illustrative examples, and help students apply knowledge to practical exercises.
{instruction_guide}
"""

USER_PROMPT = """Answer the question based only on the following context: 
{context}
Question: {question}
"""

def convert_json_dataset(data_dir="data"):
    """Load and process JSON files from data directory.
    
    Args:
        data_dir (str): Path to directory containing JSON files
        
    Returns:
        Dataset: Processed dataset for fine-tuning
    """
    processed_data = []
    json_files = glob.glob(os.path.join(data_dir, "*.json"))
    
    for json_file in json_files:
        with open(json_file, "r", encoding="utf-8") as f:
            data_list = json.load(f)
            
        for item in data_list:
            # Check if instruction is within parentheses
            instruction = item['instruction'].strip()
            if instruction.startswith('(') and instruction.endswith(')'):
                # For instructions in parentheses, add directly to 'instruction' field
                example = {
                    'instruction': TEACHER_SYSTEM_PROMPT.format(
                        instruction_guide=instruction[1:-1].strip()
                    ),
                    'input': '',  # Empty input since instruction is in system prompt
                    'output': item['response'].strip()
                }
            else:
                # For regular instructions, format using the template
                example = {
                    'instruction': TEACHER_SYSTEM_PROMPT.format(instruction_guide=''),
                    'input': USER_PROMPT.format(
                        context=item['context'].strip(), 
                        question=instruction
                    ),
                    'output': item['response'].strip()
                }
            processed_data.append(example)
            
    return Dataset.from_list(processed_data)

def create_conversation_pairs(dataset):
    """Creates conversation pairs from the dataset.
    Args:
        dataset (datasets.Dataset): The dataset containing instruction, input and output fields.

    Returns:
        datasets.Dataset: A new dataset containing conversation pairs in the format:
            {
                "conversations_raw": [
                    {"from": "system", "value": instruction},
                    {"from": "human", "value": input},
                    {"from": "gpt", "value": output}
                ]
            }
    """
    new_rows = []
    
    for i in range(len(dataset)):
        # Get current example
        example = dataset[i]
        
        # Create conversation pair
        conversation = {
            "conversations": [
                {"from": "system", "value": example["instruction"].strip()},
                {"from": "human", "value": example["input"].strip() if example["input"] else ""},
                {"from": "gpt", "value": example["output"].strip()}
            ]
        }
        new_rows.append(conversation)

    return Dataset.from_list(new_rows)

def main():
    print("Converting JSON dataset...")
    dataset = convert_json_dataset(data_dir="/home/buma04/ai-tutor/data/transcript_for_finetune_lm/json_format")

    print("Creating conversation pairs...")
    sharegpt_dataset = create_conversation_pairs(dataset)

    print("Pushing to hub...")
    sharegpt_dataset.push_to_hub(
        "mc0c0z/teacher-transcripts-sharegpt",
        token=os.getenv("HUGGINGFACE_TOKEN"),
    )
    print("Done!")

if __name__ == "__main__":
    main()
