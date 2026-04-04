<?php

declare(strict_types=1);

test('pest is wired to the laravel test case', function () {
    expect($this->app)->not->toBeNull();
});

