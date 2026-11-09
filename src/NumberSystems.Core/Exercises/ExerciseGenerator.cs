namespace NumberSystems.Core.Exercises;

public enum ConversionDirection
{
    ToDecimal,
    FromDecimal,
}

/// <param name="Number">Для ToDecimal — запись в системе Radix, для FromDecimal — десятичное число.</param>
public sealed record Exercise(ConversionDirection Direction, string Number, int Radix);

public sealed class ExerciseGenerator(Random random)
{
    /// <summary>Небольшие числа удобнее для ручного счёта.</summary>
    private const int PracticeMaxValue = 1023;

    public Exercise Next(ConversionDirection direction)
    {
        var radix = RandomRadix();

        // Изредка выдаём ноль — это отдельный, но законный случай.
        var value = random.Next(20) == 0 ? 0 : random.Next(1, PracticeMaxValue + 1);

        var number = direction == ConversionDirection.ToDecimal
            ? DivisionChain.FromDecimal(value, radix).Value!.Digits
            : value.ToString();

        return new Exercise(direction, number, radix);
    }

    // Основание 10 исключено: перевод «из десятичной в десятичную» ничему не учит.
    private int RandomRadix()
    {
        var radix = random.Next(Limits.MinRadix, Limits.MaxRadix);
        return radix >= 10 ? radix + 1 : radix;
    }
}
