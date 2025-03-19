import os
import dotenv

from model_utils import initialize_model, setup_peft_model
from trainer import ModelTrainer

dotenv.load_dotenv()


def main():
    # Initialize model
    model, tokenizer = initialize_model()
    model = setup_peft_model(model)

    # Train model
    trainer = ModelTrainer(model, tokenizer)
    trainer_instance = trainer.setup_trainer()
    trainer_instance.train()

    # Save model
    # model.push_to_hub_gguf(
    #     "mc0c0z/Llama-3.1-8B-Unit1.1",
    #     tokenizer,
    #     token=os.getenv("HUGGINGFACE_TOKEN"),
    # )
    model.save_pretrained_merged("/home/buma04/ai-tutor/weights/Llama-3.1-8B-Unit1.1", tokenizer, save_method = "merged_16bit",)

if __name__ == "__main__":
    main()
