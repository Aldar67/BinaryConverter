using NumberSystems.Core;
using NumberSystems.Core.Exercises;

namespace NumberSystems.Tests;

public class AnswerCheckerTests
{
    [Theory]
    [InlineData(1, "160", true)]
    [InlineData(1, " 160 ", true)]
    [InlineData(1, "10", false)]
    [InlineData(2, "256", true)]
    [InlineData(0, "3", true)]
    [InlineData(0, "abc", false)]
    public void Checks_digit_contribution(int position, string answer, bool correct)
    {
        var result = Check(ExerciseKind.DigitContribution, "1A3", 16, position, answer);

        Assert.Equal(correct, result.Correct);
    }

    [Fact]
    public void Explains_contribution()
    {
        var result = Check(ExerciseKind.DigitContribution, "1A3", 16, 1, "0");

        Assert.Equal("160", result.Expected);
        Assert.Equal("A · 16¹ = 10 · 16 = 160", result.Explanation);
    }

    [Theory]
    [InlineData(0, "3", true)]
    [InlineData(1, "A", true)]
    [InlineData(1, "a", true)]
    [InlineData(1, "10", true)]
    [InlineData(1, "1", false)]
    [InlineData(2, "1", true)]
    public void Checks_next_remainder_as_symbol_or_number(int step, string answer, bool correct)
    {
        Assert.Equal(correct, Check(ExerciseKind.NextRemainder, "419", 16, step, answer).Correct);
    }

    [Theory]
    [InlineData("1A3", true)]
    [InlineData("1a3", true)]
    [InlineData("3A1", false)]
    public void Checks_digit_order(string answer, bool correct)
    {
        Assert.Equal(correct, Check(ExerciseKind.DigitOrder, "419", 16, 0, answer).Correct);
    }

    [Fact]
    public void Zero_order_is_single_zero()
    {
        Assert.True(Check(ExerciseKind.DigitOrder, "0", 7, 0, "0").Correct);
    }

    [Theory]
    [InlineData(ExerciseKind.DigitContribution, "1A3", 3)]
    [InlineData(ExerciseKind.DigitContribution, "1A3", -1)]
    [InlineData(ExerciseKind.NextRemainder, "419", 3)]
    public void Rejects_missing_index(ExerciseKind kind, string number, int index)
    {
        var request = new CheckRequest(kind, number, 16, index, "0");

        Assert.Equal(ErrorCode.IndexOutOfRange, AnswerChecker.Check(request).Error!.Code);
    }

    [Fact]
    public void Propagates_invalid_number()
    {
        var request = new CheckRequest(ExerciseKind.DigitContribution, "1G", 16, 0, "0");

        Assert.Equal(ErrorCode.InvalidDigit, AnswerChecker.Check(request).Error!.Code);
    }

    [Fact]
    public void Generated_exercises_stay_within_limits()
    {
        var generator = new ExerciseGenerator(new Random(42));

        for (var i = 0; i < 500; i++)
        {
            var exercise = generator.Next(ConversionDirection.ToDecimal);
            Assert.NotEqual(10, exercise.Radix);
            Assert.True(PositionalExpansion.ToDecimal(exercise.Number, exercise.Radix).IsSuccess);
        }
    }

    private static CheckResult Check(ExerciseKind kind, string number, int radix, int index, string answer) =>
        AnswerChecker.Check(new CheckRequest(kind, number, radix, index, answer)).Value!;
}
