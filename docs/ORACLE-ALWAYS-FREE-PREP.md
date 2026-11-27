# Oracle Always Free — ZERO preparation

## Purpose

Prepare a future Oracle Cloud Infrastructure (OCI) control-plane host for ZERO
without creating cloud resources or incurring charges. This change is policy
and validation only: it does not authenticate to OCI, create a tenancy, create
a VM, open network ports, or deploy an application.

## Selected baseline

The current OCI Always Free documentation lists the Ampere A1 allowance as
1,500 OCPU-hours and 9,000 GB-hours per month, equivalent to a continuously
running allocation of up to 2 OCPUs and 12 GB RAM. The current Always Free
Block Volume allowance is 200 GB total in the tenancy home region. Limits and
eligibility must be rechecked in the OCI Console before any resource is created.

ZERO's conservative starting profile is:

| Setting | Prepared value |
|---|---:|
| Shape | `VM.Standard.A1.Flex` |
| Architecture | ARM64 |
| OCPU | 1 (hard ceiling: 2) |
| RAM | 6 GB (hard ceiling: 12 GB) |
| Boot volume | 50 GB |
| Total block storage | 200 GB maximum |
| GPU | Disabled |
| Paid fallback / trial-credit resources | Disabled |
| Public application ingress | None |
| Database public exposure | Disabled |
| Inference engines and cloud uploads | Disabled |

The initial 1 OCPU / 6 GB profile is intentionally below the maximum. It is
suitable only as a possible lightweight API/control-plane and queue host after
compatibility and resource tests. It is not a GPU inference server and should
not be described as capable of production photo/video rendering.

## Important Oracle constraints

- Always Free compute must be created in the tenancy's home region.
- An "out of host capacity" response means capacity is unavailable; wait or
  retry later. Do not upgrade the account or select a paid shape to bypass it.
- OCI may reclaim idle Always Free compute under its published idle-instance
  policy. Therefore this is not a guaranteed always-on production SLA.
- Sign-up may request a card for identity verification. Do not upgrade to Pay
  As You Go and do not provision trial-credit resources.
- A resource is not safe merely because the account is called Free Tier. Check
  the explicit **Always Free** eligibility label and the tenancy usage/limits
  before creating each resource.

## Manual gate before provisioning

1. Create or sign in to one Oracle Free Tier account using Oracle's official
   site. Choose the home region carefully; do not create a second account.
2. Do not click **Upgrade**, **Pay As You Go**, or create resources marked
   Trial/Paid.
3. In the OCI Console, inspect **Governance & Administration → Limits, Quotas
   and Usage** and confirm the A1 and Block Volume Always Free limits.
4. Confirm that the A1 shape and boot volume are explicitly marked **Always
   Free** in the resource creation flow.
5. Stop and ask for review if the console shows a price, paid status, trial
   credit consumption, an over-limit warning, or an uncertain eligibility
   label. Do not proceed on assumptions.
6. Before any VM creation, separately approve a concrete plan showing region,
   shape, OCPU, memory, boot volume, networking, and expected cost of Rp0.
7. Keep SSH closed until a narrow trusted source CIDR is supplied. Do not expose
   application, database, queue, or admin ports publicly by default.

## Intended architecture

- OCI A1: optional API, metadata, dashboard and lightweight queue/control plane.
- Private inference: remains a separate future owner-controlled worker; not
  deployed to this VM in the current Rp0 phase.
- Cloud inference: disabled until a provider, per-job consent, retention terms,
  commercial rights and a budget are explicitly approved.
- User's personal PC: never used as a worker.
- Media originals: retained; no automatic cloud upload or fallback.

## Repository checks

Validate the prepared profile:

```bash
python -m pip install -e .
PYTHONPATH=src python -m unittest tests.test_oracle_profile -v
```

The validator checks the repository policy file only. It does not prove OCI
eligibility, estimate an invoice, or provision infrastructure.

## Official references

- [OCI Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [OCI Free Tier FAQ](https://www.oracle.com/apac/cloud/free/faq/)
