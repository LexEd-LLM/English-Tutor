import yaml
from pathlib import Path

from datasets import load_dataset
from transformers import TrainingArguments
from trl import SFTTrainer
from exceptions import UnslothNotInstalledError
from model_utils import load_config

try:
    from unsloth import standardize_sharegpt, apply_chat_template, is_bfloat16_supported  # type: ignore
except ImportError:
    raise UnslothNotInstalledError

CONFIG = load_config()

class ModelTrainer:
    def __init__(self, model, tokenizer):
        self.model = model
        self.tokenizer = tokenizer

    def _load_dataset(self):
        dataset = load_dataset(
            "mc0c0z/teacher-transcripts-sharegpt", split="train"
        )
        return standardize_sharegpt(dataset)

    def _prepare_dataset(self, dataset):
        chat_template = """
        <|im_start|>system{SYSTEM}<|im_end|>
        <|im_start|>user{INPUT}<|im_end|>
        <|im_start|>assistant{OUTPUT}<|im_end|>
        """

        return apply_chat_template(
            dataset,
            tokenizer=self.tokenizer,
            chat_template=chat_template,
        )

    def setup_trainer(self):
        dataset = self._load_dataset()
        processed_dataset = self._prepare_dataset(dataset)

        training_args = TrainingArguments(
            **CONFIG['TRAINING_ARGS'],
            fp16=not is_bfloat16_supported(),
            bf16=is_bfloat16_supported(),
        )

        return SFTTrainer(
            model=self.model,
            tokenizer=self.tokenizer,
            train_dataset=processed_dataset,
            dataset_text_field="text",
            max_seq_length=CONFIG['MAX_SEQ_LENGTH'],
            dataset_num_proc=10,
            packing=False,
            args=training_args,
        )
