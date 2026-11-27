package game

import (
	"space-tactics-server/internal/game/envphysics"
	SpaceTactics "space-tactics-server/internal/generated/SpaceTactics"

	flatbuffers "github.com/google/flatbuffers/go"
)

// EncodeEnvObjectsVector serializes all active universal environmental objects from an
// envphysics.World into a FlatBuffers [EnvObject] vector for SpaceTactics.ServerState.
// Shared by both Unit Testing Sandbox (game/room.go) and 20v20 TDM (teamDeathMatch/tdm_room.go).
func EncodeEnvObjectsVector(builder *flatbuffers.Builder, world *envphysics.World) flatbuffers.UOffsetT {
	if world == nil || len(world.Objects) == 0 {
		SpaceTactics.ServerStateStartEnvObjectsVector(builder, 0)
		return builder.EndVector(0)
	}

	objOffsets := make([]flatbuffers.UOffsetT, 0, len(world.Objects))
	for _, obj := range world.Objects {
		if obj == nil {
			continue
		}

		compOffsets := make([]flatbuffers.UOffsetT, 0, len(obj.Components))
		for _, comp := range obj.Components {
			if comp == nil {
				continue
			}
			colorOff := builder.CreateString(comp.ColorHex)

			SpaceTactics.EnvComponentStart(builder)
			SpaceTactics.EnvComponentAddId(builder, comp.ID)
			SpaceTactics.EnvComponentAddKind(builder, SpaceTactics.EnvComponentKind(comp.KindCode))
			SpaceTactics.EnvComponentAddPos(builder, SpaceTactics.CreateVector2D(builder, float32(comp.Pos.X), float32(comp.Pos.Y)))
			SpaceTactics.EnvComponentAddVel(builder, SpaceTactics.CreateVector2D(builder, float32(comp.Vel.X), float32(comp.Vel.Y)))
			SpaceTactics.EnvComponentAddRadius(builder, float32(comp.Radius))
			SpaceTactics.EnvComponentAddInnerRadius(builder, float32(comp.InnerRadius))
			SpaceTactics.EnvComponentAddIsNode(builder, comp.IsNode)
			SpaceTactics.EnvComponentAddResourceType(builder, comp.ResourceEnumCode)
			SpaceTactics.EnvComponentAddColorHex(builder, colorOff)
			compOffsets = append(compOffsets, SpaceTactics.EnvComponentEnd(builder))
		}

		SpaceTactics.EnvObjectStartComponentsVector(builder, len(compOffsets))
		for i := len(compOffsets) - 1; i >= 0; i-- {
			builder.PrependUOffsetT(compOffsets[i])
		}
		compsVec := builder.EndVector(len(compOffsets))

		scale := obj.Scale
		if scale <= 0 {
			scale = 1.0
		}

		SpaceTactics.EnvObjectStart(builder)
		SpaceTactics.EnvObjectAddId(builder, obj.ID)
		SpaceTactics.EnvObjectAddBlueprintId(builder, int32(obj.BlueprintID))
		SpaceTactics.EnvObjectAddObjectType(builder, SpaceTactics.EnvObjectType(obj.ObjectTypeCode))
		SpaceTactics.EnvObjectAddPos(builder, SpaceTactics.CreateVector2D(builder, float32(obj.Center.X), float32(obj.Center.Y)))
		SpaceTactics.EnvObjectAddVel(builder, SpaceTactics.CreateVector2D(builder, float32(obj.Vel.X), float32(obj.Vel.Y)))
		SpaceTactics.EnvObjectAddAngle(builder, float32(obj.Angle))
		SpaceTactics.EnvObjectAddScale(builder, float32(scale))
		SpaceTactics.EnvObjectAddBoundingRadius(builder, float32(obj.BoundingRadius))
		SpaceTactics.EnvObjectAddParentObjectId(builder, obj.ParentObjectID)
		SpaceTactics.EnvObjectAddOrbitRadius(builder, float32(obj.OrbitRadius))
		SpaceTactics.EnvObjectAddComponents(builder, compsVec)
		objOffsets = append(objOffsets, SpaceTactics.EnvObjectEnd(builder))
	}

	SpaceTactics.ServerStateStartEnvObjectsVector(builder, len(objOffsets))
	for i := len(objOffsets) - 1; i >= 0; i-- {
		builder.PrependUOffsetT(objOffsets[i])
	}
	return builder.EndVector(len(objOffsets))
}
