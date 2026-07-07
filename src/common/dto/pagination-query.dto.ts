import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

function toOptionalPositiveInt(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : (value as number);
}

export class PaginationQueryDto {
  @ApiPropertyOptional({
    type: Number,
    default: 1,
    minimum: 1,
    description: 'Número de página (1-based)',
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalPositiveInt(value))
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    type: Number,
    default: 25,
    minimum: 1,
    maximum: 100,
    description: 'Cantidad de resultados por página',
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalPositiveInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}
