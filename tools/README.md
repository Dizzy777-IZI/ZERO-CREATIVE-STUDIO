# ZERO Tools

## Privacy-first engine router

The first executable component is `src/zero_router/policy.py`. It makes a deterministic engine selection decision from the job's operation, data classification, explicit cloud consent, and declared engine capabilities.

It does not transfer media, call an API, launch a worker, or edit files. Those adapters are separate future phases.

### Run tests

Requires Python 3.11 or newer. The router and tests use only the Python standard library.

From the repository root:

```bash
python -m unittest discover -s tests -v
```

### Install for development

```bash
python -m pip install -e .
```

Do not add API keys, model weights, private media, or worker credentials to this repository.
