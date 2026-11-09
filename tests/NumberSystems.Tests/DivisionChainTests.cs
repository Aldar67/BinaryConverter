using NumberSystems.Core;

namespace NumberSystems.Tests;

public class DivisionChainTests
{
    [Fact]
    public void Records_each_division_and_reverses_remainders()
    {
        var result = DivisionChain.FromDecimal(419, 16).Value!;

        Assert.Equal(
            [
                new DivisionStep(0, 419, 16, 26, 3, '3'),
                new DivisionStep(1, 26, 16, 1, 10, 'A'),
                new DivisionStep(2, 1, 16, 0, 1, '1'),
            ],
            result.Steps);
        Assert.Equal("1A3", result.Digits);
    }

    [Fact]
    public void Zero_gives_one_step_and_digit_zero()
    {
        var result = DivisionChain.FromDecimal(0, 2).Value!;

        Assert.Equal(new DivisionStep(0, 0, 2, 0, 0, '0'), Assert.Single(result.Steps));
        Assert.Equal("0", result.Digits);
    }

    [Fact]
    public void Round_trips_every_value_in_every_radix()
    {
        for (var radix = Limits.MinRadix; radix <= Limits.MaxRadix; radix++)
        for (var value = 0; value <= Limits.MaxValue; value++)
        {
            var digits = DivisionChain.FromDecimal(value, radix).Value!.Digits;
            Assert.Equal(value, PositionalExpansion.ToDecimal(digits, radix).Value!.Value);
        }
    }

    [Theory]
    [InlineData("12a", ErrorCode.InvalidDigit)]
    [InlineData("-1", ErrorCode.NegativeNumber)]
    [InlineData("5000", ErrorCode.ValueOutOfRange)]
    [InlineData("", ErrorCode.EmptyInput)]
    public void Validates_decimal_input(string input, ErrorCode expected)
    {
        Assert.Equal(expected, DivisionChain.FromDecimal(input, 2).Error!.Code);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(17)]
    public void Rejects_radix_out_of_range(int radix)
    {
        Assert.Equal(ErrorCode.RadixOutOfRange, DivisionChain.FromDecimal(10, radix).Error!.Code);
    }
}
