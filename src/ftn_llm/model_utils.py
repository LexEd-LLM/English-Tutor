import yaml
from pathlib import Path

from exceptions import UnslothNotInstalledError

try:
    from unsloth import FastLanguageModel  # type: ignore
except ImportError:
    raise UnslothNotInstalledError

def load_config():
    """Load configuration from yaml file."""
    config_path = Path(__file__).parent / "config.yaml"
    with open(config_path, "r") as f:
        return yaml.safe_load(f)

CONFIG = load_config()

def initialize_model():
    """Initialize and return the base model and tokenizer."""
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=CONFIG["MODEL_CONFIG"]["model_name"],
        max_seq_length=CONFIG["MAX_SEQ_LENGTH"],
        load_in_4bit=CONFIG["MODEL_CONFIG"]["load_in_4bit"],
        fast_inference=CONFIG["MODEL_CONFIG"]["fast_inference"],
        gpu_memory_utilization=CONFIG["MODEL_CONFIG"]["gpu_memory_utilization"],
    )
    return model, tokenizer

def setup_peft_model(model):
    """Apply PEFT configuration to the model."""
    return FastLanguageModel.get_peft_model(model, **CONFIG['PEFT_CONFIG'])
