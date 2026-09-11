"""Model JSON şeması testleri / model JSON schema tests.

Şema, iki hattın (Python referans, Rust üretim) ortak sözleşmesidir; tipler
buradan üretilir. Bozuk bir şema iki uygulamanın sessizce ayrışması demektir,
bu yüzden şemanın kendisi de test edilir — yalnızca ona uyan örnekler değil.

The schema is the contract between the two implementation tracks. A broken
schema means the two silently diverge, so the schema itself is tested, not just
instances that conform to it.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import jsonschema
import pytest

SCHEMA_PATH = Path(__file__).resolve().parents[2] / "schema" / "model.schema.json"
FIXTURE_PATH = Path(__file__).parent / "fixtures" / "simply-supported-beam.json"


def _load(path: Path) -> dict[str, Any]:
    """JSON'u oku ve tipini sınırda daralt. ``json.loads`` ``Any`` döner;
    onu olduğu gibi taşımak tip denetiminin tüm faydasını kaybettirir."""
    data: object = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise TypeError(f"{path.name}: kök nesne bir JSON object olmalı / must be an object")
    return data


@pytest.fixture(scope="module")
def schema() -> dict[str, Any]:
    return _load(SCHEMA_PATH)


@pytest.fixture
def beam() -> dict[str, Any]:
    return _load(FIXTURE_PATH)


def test_the_schema_is_itself_valid(schema: dict[str, Any]) -> None:
    jsonschema.Draft202012Validator.check_schema(schema)


def test_the_reference_model_conforms(schema: dict[str, Any], beam: dict[str, Any]) -> None:
    jsonschema.validate(beam, schema)


class TestTheSchemaRejects:
    def test_a_model_without_declared_units(
        self, schema: dict[str, Any], beam: dict[str, Any]
    ) -> None:
        """Varsayılan birim, sessiz 1000 kat hatanın en yaygın kaynağıdır (ADR-0002)."""
        del beam["units"]
        with pytest.raises(jsonschema.ValidationError, match="units"):
            jsonschema.validate(beam, schema)

    def test_an_unregistered_unit(self, schema: dict[str, Any], beam: dict[str, Any]) -> None:
        beam["units"]["force"] = "kip"
        with pytest.raises(jsonschema.ValidationError):
            jsonschema.validate(beam, schema)

    def test_a_design_code_field(self, schema: dict[str, Any], beam: dict[str, Any]) -> None:
        """Yönetmelik bir analiz parametresidir, model özelliği değil (ADR-0003).

        Şema ``additionalProperties: false`` ile bu alanın eklenmesini engeller.
        """
        beam["designCode"] = "TBDY2018"
        with pytest.raises(jsonschema.ValidationError):
            jsonschema.validate(beam, schema)

    def test_a_non_positive_section_dimension(
        self, schema: dict[str, Any], beam: dict[str, Any]
    ) -> None:
        beam["sections"][0]["height"] = 0.0
        with pytest.raises(jsonschema.ValidationError):
            jsonschema.validate(beam, schema)

    def test_an_empty_node_list(self, schema: dict[str, Any], beam: dict[str, Any]) -> None:
        beam["nodes"] = []
        with pytest.raises(jsonschema.ValidationError):
            jsonschema.validate(beam, schema)

    def test_a_malformed_concrete_grade(
        self, schema: dict[str, Any], beam: dict[str, Any]
    ) -> None:
        beam["members"][0]["concrete"] = "C30"
        with pytest.raises(jsonschema.ValidationError):
            jsonschema.validate(beam, schema)

    def test_a_combination_with_no_factors(
        self, schema: dict[str, Any], beam: dict[str, Any]
    ) -> None:
        beam["combinations"][0]["factors"] = {}
        with pytest.raises(jsonschema.ValidationError):
            jsonschema.validate(beam, schema)

    def test_a_misspelled_property(self, schema: dict[str, Any], beam: dict[str, Any]) -> None:
        """Yazım hatası sessizce yok sayılmamalı: 'nodeI' yerine 'node_i'."""
        beam["members"][0]["node_i"] = beam["members"][0].pop("nodeI")
        with pytest.raises(jsonschema.ValidationError):
            jsonschema.validate(beam, schema)


class TestSchemaAndDataclassesAgree:
    """Şema ile Python modeli ayrışmamalı. Üretilmiş tipler gelene dek elle bağ."""

    def test_load_kinds_match(self, schema: dict[str, Any]) -> None:
        from rcsolve_ref.model.structure import LoadKind

        allowed = set(schema["properties"]["loadCases"]["items"]["properties"]["kind"]["enum"])
        assert allowed == {k.value for k in LoadKind}

    def test_combination_kinds_match(self, schema: dict[str, Any]) -> None:
        from rcsolve_ref.model.structure import CombinationKind

        allowed = set(schema["properties"]["combinations"]["items"]["properties"]["kind"]["enum"])
        assert allowed == {k.value for k in CombinationKind}

    def test_steel_grades_match(self, schema: dict[str, Any]) -> None:
        from rcsolve_ref.model.materials import STEEL_GRADES

        allowed = set(schema["properties"]["members"]["items"]["properties"]["rebar"]["enum"])
        assert allowed == set(STEEL_GRADES)

    def test_concrete_grade_pattern_accepts_every_defined_grade(
        self, schema: dict[str, Any], beam: dict[str, Any]
    ) -> None:
        from rcsolve_ref.model.materials import CONCRETE_GRADES

        for name in CONCRETE_GRADES:
            candidate = copy.deepcopy(beam)
            candidate["members"][0]["concrete"] = name
            jsonschema.validate(candidate, schema)

    def test_restraint_dofs_match(self, schema: dict[str, Any]) -> None:
        from rcsolve_ref.model.structure import Restraint

        schema_dofs = set(schema["$defs"]["restraint"]["properties"])
        assert schema_dofs == set(Restraint.__dataclass_fields__)

    def test_schema_version_matches_the_code(self, schema: dict[str, Any]) -> None:
        from rcsolve_ref.model.structure import SCHEMA_VERSION

        assert schema["$id"].endswith(f"/{SCHEMA_VERSION}")
        assert schema["properties"]["schemaVersion"]["pattern"] == r"^\d+\.\d+$"
