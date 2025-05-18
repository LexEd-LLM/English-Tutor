docker run \
  --runtime=nvidia \
  --gpus all \
  --name gemma-3-12b-it-int4-awq \
  -v /home/buma04/weights_llm:/models \
  -p 8800:8000 \
  --ipc=host \
  --env PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True \
  vllm/vllm-openai:v0.8.2 \
  --model /models/gemma-3-12b-it-int4-awq \
  --served_model_name gemma-3-12b \
  --max-model-len 8096 \
  --tensor-parallel-size 2 \
  --max-num-seqs 20 \
  --gpu-memory-utilization 0.7 \
  --generation-config vllm